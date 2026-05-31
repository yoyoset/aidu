// Enable global console logging first
import { consoleInterceptor } from '../utils/console_interceptor.js';
consoleInterceptor.enable();

import { pipelineManager } from './pipeline_manager.js';
import { DraftProcessor } from './llm/draft_processor.js';
import { MessageRouter, MessageTypes } from '../utils/message_router.js';
import { SyncService } from '../services/sync_service.js';
import { vocabService } from '../services/vocab_service.js';
import { profileManager } from '../core/profile_manager.js';
import { StorageHelper, StorageKeys } from '../utils/storage.js';
import { initI18n, t } from '../locales/index.js';

console.log('AIDU Service Worker Initialized');
const messageRouter = new MessageRouter();

// [Phase 3] Run data migration on startup
DraftProcessor.migrateAllDrafts();

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Initialize i18n and context menus
async function setupContextMenus() {
    try {
        await initI18n();
        await chrome.contextMenus.removeAll();

        chrome.contextMenus.create({
            id: 'save-selection',
            title: t('context.save') || 'Save to AIDU Library',
            contexts: ['selection']
        }, () => {
            if (chrome.runtime.lastError) {
                console.debug('Context menu "save-selection" already exists (handled)');
            }
        });

        chrome.contextMenus.create({
            id: 'open-dashboard',
            title: t('context.open') || 'Open AIDU Dashboard',
            contexts: ['page', 'action']
        }, () => {
            if (chrome.runtime.lastError) {
                console.debug('Context menu "open-dashboard" already exists (handled)');
            }
        });
        console.log('SW: Context menus recreated successfully');
    } catch (e) {
        console.error('SW: Failed to setup context menus:', e);
    }
}

// Listen for settings changes to update language
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[StorageKeys.USER_SETTINGS]) {
        console.log('SW: Settings changed, updating context menus');
        setupContextMenus();
    }
});

// Auto-sync every 30 minutes
chrome.alarms.create('auto-sync', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'auto-sync') {
        try {
            console.log('SW: Auto-sync triggered');
            await profileManager.load();
            const settings = profileManager.settings;

            if (settings?.sync?.customUrl && settings?.sync?.customToken) {
                const profileId = settings.activeProfileId || 'default';
                console.log(`SW: Syncing profile '${profileId}'`);

                // Update VocabService context for this background instance
                vocabService.setProfile(profileId);

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
    console.log('[SW] Received REQUEST_ANALYSIS for:', draftId);
    try {
        await pipelineManager.addToQueue(draftId);
        console.log('[SW] Successfully added to Pipeline queue:', draftId);
    } catch (err) {
        console.error('[SW] Error adding to Pipeline queue:', err);
    }
    return { success: true };
});

// Handle Draft Creation (New standardized flow)
messageRouter.on(MessageTypes.CREATE_DRAFT, async ({ text, title, url, data, status }) => {
    console.log('SW: Received draft creation request');
    const draft = await pipelineManager.createDraft(text, title, url, data, status);
    return { success: true, draft };
});

// Handle Draft Update (Atomic cross-process save)
messageRouter.on(MessageTypes.UPDATE_DRAFT, async ({ draftId, updates }) => {
    console.log('SW: Received draft update request for', draftId);
    await pipelineManager.applyPartialUpdate(draftId, updates);
    return { success: true };
});

// Handle Draft Deletion (Atomic cross-process wipe)
messageRouter.on(MessageTypes.DELETE_DRAFT, async ({ draftId }) => {
    console.log('SW: Received draft deletion request for', draftId);
    await pipelineManager.deleteDraft(draftId);
    return { success: true };
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('AIDU Extension Installed');
    setupContextMenus();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    // 1. Silent Save Logic
    if (info.menuItemId === 'save-selection') {
        const text = info.selectionText;
        if (text) {
            console.log('Context Menu Save Selection triggered');
            try {
                // 1. Open sidepanel first
                await chrome.sidePanel.open({ tabId: tab.id });

                // 2. Wait a small bit for UI to mount if necessary and send message
                // We send it to top-level runtime so sidepanel can catch it
                setTimeout(() => {
                    chrome.runtime.sendMessage({
                        type: MessageTypes.OPEN_CREATOR_MODAL,
                        payload: { text: text, title: tab.title || '' }
                    });
                }, 500);
            } catch (e) {
                console.error('Failed to open sidepanel from context menu:', e);
            }
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
