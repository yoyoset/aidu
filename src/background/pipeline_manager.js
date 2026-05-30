
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

    async createDraft(text, title, url, data = null, status = null) {
        const chunks = this.executionEngine.textChunker.chunk(text || '');
        const chunkCount = chunks.length;
        return await draftStateManager.createDraft(text, title, url, chunkCount, data, status);
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
