import { StorageHelper, StorageKeys } from '../utils/storage.js';
import { SchemaDefaults } from '../core/schema.js';
import { TextChunker } from './llm/text_chunker.js';
import { ApiClient } from './llm/api_client.js';
import { SmartRouter } from './llm/smart_router.js';

// Pipeline Manager
// Handles the drafting, preparation, and execution queues (DVE Pattern).

class PipelineManager {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        // Use smaller chunks (600 chars ~ 150 words) to enable better parallelism
        this.textChunker = new TextChunker({ maxSize: 600 });
        this.apiClient = new ApiClient();
        this.smartRouter = new SmartRouter();
        this.keepAliveInterval = null;
        this._saveQueue = Promise.resolve();
    }

    async createDraft(text) {
        const draft = SchemaDefaults.createDraft(text);

        // 1. Raw Meat Sanitization & Segmentation
        const rawChunks = this.textChunker.chunk(text);

        // Convert to Object Chunks for Status Tracking
        const chunks = rawChunks.map((txt, i) => ({
            index: i,
            text: txt,
            status: 'pending',
            result: []
        }));

        // 2. Persistent Storage
        draft.data = draft.data || {};
        draft.data.chunks = chunks;
        draft.data.sentences = [];

        draft.progress = {
            current: 0,
            total: chunks.length,
            percentage: 0
        };

        let drafts = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS);
        if (!Array.isArray(drafts)) drafts = drafts ? Object.values(drafts) : [];
        drafts.unshift(draft);

        await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, drafts);
        return draft;
    }

    async addToQueue(draftId) {
        this.queue.push(draftId);
        this.processNext();
    }

    async processNext() {
        if (this.isProcessing || this.queue.length === 0) {
            if (this.queue.length === 0) this.stopKeepAlive();
            return;
        }

        this.isProcessing = true;
        this.startKeepAlive();
        const draftId = this.queue.shift();

        try {
            console.log(`Pipeline: Processing draft ${draftId}`);
            await this.executeAnalysis(draftId);
        } catch (error) {
            console.error('Pipeline Error:', error);
            // Notify UI
            chrome.runtime.sendMessage({
                type: 'SHOW_ERROR_TOAST',
                payload: { message: `分析失败: ${error.message || '未知错误'}` }
            }).catch(() => { }); // Ignore if sidepanel is closed

            await this.updateDraftStatus(draftId, 'error');
        } finally {
            this.isProcessing = false;
            if (this.queue.length > 0) {
                setTimeout(() => this.processNext(), 100);
            } else {
                this.stopKeepAlive();
            }
        }
    }

    startKeepAlive() {
        if (this.keepAliveInterval) return;
        this.keepAliveInterval = setInterval(() => {
            chrome.runtime.getPlatformInfo(() => { });
        }, 20000);
    }

    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }

    /**
     * Parallel Execution Engine
     */
    async executeAnalysis(draftId) {
        // Load latest draft
        let drafts = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS) || [];
        let draft = drafts.find(d => d.id === draftId);
        if (!draft) throw new Error(`Draft ${draftId} not found`);

        await this.updateDraftStatus(draftId, 'processing');

        // Ensure data object exists
        if (!draft.data) draft.data = {};

        // Normalize legacy string chunks if needed
        let chunks = draft.data?.chunks || [];
        if (chunks.length > 0 && typeof chunks[0] === 'string') {
            chunks = chunks.map((txt, i) => ({ index: i, text: txt, status: 'pending', result: [] }));
            draft.data.chunks = chunks; // UpdateInMemory
        } else if (chunks.length === 0) {
            // Fallback Generation
            const raw = this.textChunker.chunk(draft.rawText);
            chunks = raw.map((txt, i) => ({ index: i, text: txt, status: 'pending', result: [] }));
            draft.data.chunks = chunks;
        }

        // CRITICAL: Persist initialized chunks immediately so UI shows "pending" blocks
        draft.updatedAt = Date.now();
        await this.saveSafe(draft);

        // Prepare Router
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        this.smartRouter.setTeachingStyle(settings.teachingStyle || 'casual');

        const route = this.smartRouter.route(draft);
        const systemPrompt = route.system;

        // Concurrency Control
        const apiConfig = await this.apiClient.getConfig();
        const providerLimits = {
            'gemini': 5,
            'deepseek': 10,
            'openai': 5,
            'custom': 3
        };
        const CONCURRENCY_LIMIT = providerLimits[apiConfig.provider] || 5;
        const pendingChunks = chunks.filter(c => c.status !== 'done');

        // Progress Helper
        const updateProgress = async () => {
            // Re-read draft from storage to avoid race conditions? 
            // Actually saveSafe handles whole draft overwrite. 
            // We rely on 'chunks' ref being mutated in memory then saved.

            // Create snapshot to avoid race conditions during iteration
            const snapshot = chunks.map(c => ({ ...c }));
            const completed = snapshot.filter(c => c.status === 'done').length;
            const pct = Math.round((completed / chunks.length) * 100);

            // Re-assemble all sentences in order
            const allSentences = [];
            snapshot.sort((a, b) => a.index - b.index).forEach(c => {
                if (c.result && c.result.length) allSentences.push(...c.result);
            });

            draft.data.sentences = allSentences;
            draft.progress = { current: completed, total: chunks.length, percentage: pct };
            draft.updatedAt = Date.now();

            await this.saveSafe(draft);
        };

        // Worker Function
        const processChunk = async (chunk) => {
            const MAX_RETRIES = 2;
            let lastError = null;

            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                const timeoutPromise = new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), 120000));
                try {
                    const responseJson = await Promise.race([
                        this.apiClient.streamCompletion(chunk.text, systemPrompt),
                        timeoutPromise
                    ]);

                    let parsed;
                    try {
                        parsed = JSON.parse(responseJson);
                    } catch (e) {
                        console.error(`Chunk ${chunk.index}: Invalid JSON`, responseJson.substring(0, 100));
                        throw new Error(`JSON parse error: ${e.message}`);
                    }
                    chunk.result = Array.isArray(parsed.sentences) ? parsed.sentences : [];
                    chunk.status = 'done';
                    await updateProgress();
                    return; // Success, exit retry loop
                } catch (err) {
                    lastError = err;
                    console.warn(`Chunk ${chunk.index} attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`, err.message);
                    if (attempt < MAX_RETRIES) {
                        await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Backoff
                    }
                }
            }

            // All retries exhausted
            console.error(`Chunk ${chunk.index} failed after ${MAX_RETRIES + 1} attempts`, lastError);
            chunk.status = 'error';
            chunk.errorMessage = lastError?.message;
            await updateProgress();
        };

        // Execution Pool
        const executing = [];
        for (const chunk of pendingChunks) {
            chunk.status = 'processing';
            const p = processChunk(chunk).then(() => {
                executing.splice(executing.indexOf(p), 1);
            });
            executing.push(p);

            if (executing.length >= CONCURRENCY_LIMIT) {
                await Promise.race(executing);
            }
        }

        await Promise.all(executing);

        // Final Status
        const anyError = chunks.some(c => c.status === 'error' || c.status === 'pending');
        if (!anyError) {
            await this.updateDraftStatus(draftId, 'ready');
            console.log(`Pipeline: Draft ${draftId} parallel exec completed.`);
        } else {
            // Partial success is still 'processing' or 'error'?
            // User wants to know failed block.
            // We set to 'error' to indicate attention needed.
            await this.updateDraftStatus(draftId, 'error');
        }
    }

    // Mutex Safe Save (Queue)
    async saveSafe(draft) {
        this._saveQueue = this._saveQueue.then(async () => {
            const all = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS) || [];
            const idx = all.findIndex(d => d.id === draft.id);
            if (idx !== -1) {
                all[idx] = draft;
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, all);
            }
        }).catch(err => {
            console.error('Save queue error:', err);
        });

        return this._saveQueue;
    }

    async updateDraftStatus(draftId, status, extraData = {}) {
        const drafts = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS) || [];
        const index = drafts.findIndex(d => d.id === draftId);
        if (index !== -1) {
            drafts[index].status = status;
            Object.assign(drafts[index], extraData);
            drafts[index].updatedAt = Date.now();
            await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, drafts);
        }
    }
}
export const pipelineManager = new PipelineManager();
