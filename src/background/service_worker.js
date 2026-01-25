// AIDU Service Worker
import { pipelineManager } from './pipeline_manager.js';
import { MessageRouter, MessageTypes } from '../utils/message_router.js';
import { SyncService } from '../services/sync_service.js';
import { vocabService } from '../services/vocab_service.js';
import { StorageHelper, StorageKeys } from '../utils/storage.js';

console.log('AIDU Service Worker Initialized');
const messageRouter = new MessageRouter();

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Auto-sync every 30 minutes
chrome.alarms.create('auto-sync', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'auto-sync') {
        try {
            console.log('SW: Auto-sync triggered');
            const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS);

            if (settings?.sync?.provider) {
                // CRITICAL: Ensure we sync the user's ACTIVE profile, not just default.
                let activeProfile = settings.activeProfileId || 'default';

                // Validate profile exists (prevent syncing if profile was deleted but settings not updated)
                if (activeProfile !== 'default' && !settings.profiles?.[activeProfile]) {
                    console.warn(`SW: Active profile '${activeProfile}' not found, fallback to default`);
                    activeProfile = 'default';
                }

                console.log(`SW: Syncing profile '${activeProfile}'`);

                // Update VocabService context for this background instance
                vocabService.setProfile(activeProfile);

                await SyncService.pull();
                await SyncService.push();
                console.log('SW: Auto-sync completed');
            }
        } catch (e) {
            console.error('SW: Auto-sync failed:', e);
        }
    }
});

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
            chrome.action.setBadgeText({ text: 'OK', tabId: tab.id });
            setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 2000);
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
