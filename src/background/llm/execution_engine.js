import { ApiClient } from './api_client.js';
import { SmartRouter } from './smart_router.js';
import { TextChunker } from './text_chunker.js';
import { DraftProcessor } from './draft_processor.js';
import { draftStateManager } from '../managers/draft_state_manager.js';
import { logger } from '../../utils/logger.js';
import { StorageHelper, StorageKeys } from '../../utils/storage.js';
import { ResponseValidator } from './utils/response_validator.js';

export class ExecutionEngine {
    constructor() {
        this.apiClient = new ApiClient();
        this.smartRouter = new SmartRouter();
        this.textChunker = new TextChunker({ maxSize: 600 });
    }

    async execute(draftId) {
        logger.info(`ExecutionEngine: Starting analysis for ${draftId}`, null, true);

        // 1. Load Draft
        const draft = await draftStateManager.getDraft(draftId);
        if (!draft) {
            logger.critical(`ExecutionEngine: Draft ${draftId} not found!`);
            throw new Error(`Draft ${draftId} not found`);
        }

        await draftStateManager.updateDraftStatus(draftId, 'processing');

        // 2. Refresh Chunks (ensure consistency)
        const rawChunks = this.textChunker.chunk(draft.rawText);
        console.log(`[ExecutionEngine] Content split into ${rawChunks.length} chunks`);

        // Ensure progress total is correct
        if (!draft.progress) draft.progress = {};
        draft.progress.total = rawChunks.length;

        draft.updatedAt = Date.now();
        await draftStateManager.saveSafe(draft);

        // 3. Throttle Save Setup
        let lastSave = 0;
        const throttledSave = async () => {
            const now = Date.now();
            if (now - lastSave > 1500) {
                lastSave = now;
                await draftStateManager.saveSafe(draft);
            }
        };

        // 4. Prepare Context
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        this.smartRouter.setTeachingStyle(settings.teachingStyle || 'casual');

        const route = await this.smartRouter.route(draft);
        const systemPrompt = route.system;

        // 5. Concurrency Config
        const apiConfig = await this.apiClient.getConfig();
        let CONCURRENCY_LIMIT = this.getConcurrencyLimit(apiConfig);

        console.log(`[ExecutionEngine] Starting execution pool (Limit: ${CONCURRENCY_LIMIT})`);

        const strategyId = draft.analysisMode || 2;

        // 6. Execution Pool
        const executing = [];
        for (let i = 0; i < rawChunks.length; i++) {
            const chunkText = rawChunks[i];

            const worker = async () => {
                // Retry Logic
                const MAX_RETRIES = 2;
                for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                    try {
                        const result = await this.processChunk(chunkText, systemPrompt, i, rawChunks.length, strategyId);

                        // Incremental Aggregation
                        DraftProcessor.applyChunkResult(draft, i, result);
                        await throttledSave();
                        return;
                    } catch (err) {
                        console.error(`[ExecutionEngine] Error chunk ${i} (Attempt ${attempt}):`, err);
                        if (attempt === MAX_RETRIES) throw err;
                        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
                    }
                }
            };

            const p = worker().catch(err => {
                logger.error(`ExecutionEngine: Chunk ${i} failed finally.`, { error: err.message });
            }).finally(() => {
                executing.splice(executing.indexOf(p), 1);
            });

            executing.push(p);
            if (executing.length >= CONCURRENCY_LIMIT) {
                await Promise.race(executing);
            }
        }

        await Promise.all(executing);

        // 7. Finalize
        await this.finalizeDraft(draft, draftId);
    }

    async processChunk(chunkText, systemPrompt, index, total, mode) {
        console.log(`[ExecutionEngine] Processing chunk ${index + 1}/${total}`);
        const responseJson = await this.apiClient.streamCompletion(chunkText, systemPrompt, { mode });

        try {
            const parsed = JSON.parse(responseJson);
            
            // 核心改进：引入数据对齐验证层
            const validated = ResponseValidator.validate(parsed, mode);
            
            if (!validated.sentences || validated.sentences.length === 0) {
                console.warn(`[ExecutionEngine] Chunk ${index + 1} returned zero valid sentences!`);
            }
            
            return validated;
        } catch (err) {
            console.error(`[ExecutionEngine] Failed to parse/validate JSON for chunk ${index + 1}:`, err);
            console.error(`[ExecutionEngine] Raw response:`, responseJson);
            throw err;
        }
    }

    async finalizeDraft(draft, draftId) {
        const finalSentences = draft.data?.sentences || [];
        const isActuallyDone = finalSentences.length > 0;

        draft.status = isActuallyDone ? 'ready' : 'error';
        draft.updatedAt = Date.now();

        logger.info(`ExecutionEngine: Finished ${draftId}. Status: ${draft.status}`, { count: finalSentences.length });
        await draftStateManager.saveSafe(draft);
    }

    getConcurrencyLimit(apiConfig) {
        const limits = { 'gemini': 5, 'deepseek': 5, 'openai': 5, 'custom': 3 };
        let limit = limits[apiConfig.provider] || 5;

        if (apiConfig.model?.includes('flash') || apiConfig.model?.includes('free')) {
            limit = 2;
        }
        return limit;
    }
}
