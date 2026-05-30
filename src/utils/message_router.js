/**
 * MessageRouter
 * Handles communication between Service Worker and Sidepanel/Content Scripts.
 */

export const MessageTypes = {
    PIPELINE_STATUS_UPDATE: 'PIPELINE_STATUS_UPDATE',
    NEW_DRAFT_CREATED: 'NEW_DRAFT_CREATED',
    REQUEST_ANALYSIS: 'REQUEST_ANALYSIS',
    GET_DRAFT_STATUS: 'GET_DRAFT_STATUS',
    CREATE_DRAFT: 'CREATE_DRAFT',
    UPDATE_DRAFT: 'UPDATE_DRAFT',
    DELETE_DRAFT: 'DELETE_DRAFT',
    OPEN_CREATOR_MODAL: 'OPEN_CREATOR_MODAL'
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
            const isFrequent = type === MessageTypes.UPDATE_DRAFT || type === MessageTypes.PIPELINE_STATUS_UPDATE;
            
            if (!isFrequent) {
                console.log(`[MessageRouter] Receiving: ${type}`, payload);
            }

            if (this.listeners.has(type)) {
                const callbacks = this.listeners.get(type);
                for (const callback of callbacks) {
                    try {
                        const result = await callback(payload, sender);
                        if (result) {
                            if (!isFrequent) console.log(`[MessageRouter] Response sent for ${type}`, result);
                            sendResponse(result);
                        }
                    } catch (err) {
                        console.error(`[MessageRouter] Error handling ${type}:`, err);
                        sendResponse({ error: err.message });
                    }
                }
            } else if (!isFrequent) {
                console.warn(`[MessageRouter] No listeners for: ${type}`);
            }
        })();
        // Return true to indicate async response might be sent
        return true;
    }

    static sendMessage(type, payload) {
        const isFrequent = type === MessageTypes.UPDATE_DRAFT || type === MessageTypes.PIPELINE_STATUS_UPDATE;
        if (!isFrequent) {
            console.log(`[MessageRouter] Sending: ${type}`, payload);
        }
        chrome.runtime.sendMessage({ type, payload }).catch((err) => {
            if (!isFrequent) console.warn(`[MessageRouter] Send failed for ${type}:`, err.message);
        });
    }
}
