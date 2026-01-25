/**
 * MessageRouter
 * Handles communication between Service Worker and Sidepanel/Content Scripts.
 */

export const MessageTypes = {
    PIPELINE_STATUS_UPDATE: 'PIPELINE_STATUS_UPDATE',
    NEW_DRAFT_CREATED: 'NEW_DRAFT_CREATED',
    REQUEST_ANALYSIS: 'REQUEST_ANALYSIS',
    GET_DRAFT_STATUS: 'GET_DRAFT_STATUS'
};

export class MessageRouter {
    constructor() {
        this.listeners = new Map();
        // Start listening
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    }

    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
    }

    handleMessage(message, sender, sendResponse) {
        (async () => {
            const { type, payload } = message;
            if (this.listeners.has(type)) {
                const callbacks = this.listeners.get(type);
                for (const callback of callbacks) {
                    try {
                        const result = await callback(payload, sender);
                        if (result) sendResponse(result);
                    } catch (err) {
                        console.error('Message handler error:', err);
                        sendResponse({ error: err.message });
                    }
                }
            }
        })();
        // Return true to indicate async response might be sent
        return true;
    }

    static sendMessage(type, payload) {
        chrome.runtime.sendMessage({ type, payload }).catch(() => {
            // Ignore "receiving end does not exist" errors
        });
    }
}
