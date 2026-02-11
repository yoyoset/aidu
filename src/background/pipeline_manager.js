
import { ExecutionEngine } from './llm/execution_engine.js';
import { draftStateManager } from './managers/draft_state_manager.js';
import { logger } from '../utils/logger.js';

/**
 * Pipeline Manager (Coordinator)
 * Orchestrates the queue and keeps the service worker alive.
 * Delegates Persistence to DraftStateManager.
 * Delegates Logic to ExecutionEngine.
 */
class PipelineManager {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.executionEngine = new ExecutionEngine();
        this.keepAliveInterval = null;
    }

    // --- Public Facade (Delegates to State Manager) ---

    async createDraft(text, title, url) {
        // Just forward to manager
        // We need to chunk first? 
        // Original logic: initialized chunk count in createInitialState.
        // ExecutionEngine uses textChunker internally.
        // Let's instantiate a temporary chunker or helper to get count?
        // Actually DraftStateManager imports DraftProcessor which doesn't know chunk count unless passed.
        // Let's create a helper in ExecutionEngine or just use TextChunker here temporarily.
        // Cleaner: Move chunking logic inside createDraft?
        // For now, I'll replicate the lightweight chunk count check or just utilize the ExecutionEngine's chunker if exposed.
        // ExecutionEngine.textChunker is exposed.

        const chunks = this.executionEngine.textChunker.chunk(text);
        return await draftStateManager.createDraft(text, title, url, chunks.length);
    }

    async applyPartialUpdate(draftId, updates) {
        return await draftStateManager.applyPartialUpdate(draftId, updates);
    }

    async deleteDraft(draftId) {
        return await draftStateManager.deleteDraft(draftId);
    }

    // --- Queue Management ---

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
            await this.executionEngine.execute(draftId);
        } catch (error) {
            console.error('Pipeline Error:', error);
            // Notify UI
            chrome.runtime.sendMessage({
                type: 'SHOW_TOAST',
                payload: { message: `分析失败: ${error.message || '未知错误'}`, type: 'error' }
            }).catch(() => { });

            await draftStateManager.updateDraftStatus(draftId, 'error');
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
}

export const pipelineManager = new PipelineManager();
