// AIDU Service Worker
import { pipelineManager } from './pipeline_manager.js';
import { MessageRouter, MessageTypes } from '../utils/message_router.js';

console.log('AIDU Service Worker Initialized');
const messageRouter = new MessageRouter();

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Handle Analysis Requests from UI
messageRouter.on(MessageTypes.REQUEST_ANALYSIS, async ({ draftId }) => {
    console.log('SW: Received analysis request for', draftId);
    await pipelineManager.addToQueue(draftId);
    return { success: true };
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('AIDU Extension Installed');
    // Setup context menu
    chrome.contextMenus.create({
        id: 'save-selection',
        title: 'Save to AIDU Library',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        id: 'open-dashboard',
        title: 'Open AIDU Dashboard',
        contexts: ['page', 'action']
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    // 1. Silent Save Logic
    if (info.menuItemId === 'save-selection') {
        const text = info.selectionText;
        if (text) {
            console.log('Silent Save:', text.substring(0, 20) + '...');

            // Create draft (Background processing if pipeline supports it, currently just saves raw meat)
            const draft = await pipelineManager.createDraft(text);

            // Optional: Provide visual feedback via Badge or Notification
            // chrome.action.setBadgeText({ text: 'OK', tabId: tab.id });
            // setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 2000);
        }
    }

    // 2. Global Entry Point
    if (info.menuItemId === 'open-dashboard') {
        try {
            await chrome.sidePanel.open({ tabId: tab.id });
        } catch (e) {
            console.warn('Could not open sidepanel:', e);
        }
    }
});
