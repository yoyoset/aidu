// Enable global console logging first
import { consoleInterceptor } from '../utils/console_interceptor.js';
consoleInterceptor.enable();

import './styles/main.css';
import { initI18n, t } from '../locales/index.js';
// PreparationDashboard imports its own styles now
import { PreparationDashboard } from './features/builder/preparation_dashboard.js';
import { MessageRouter, MessageTypes } from '../utils/message_router.js';
import { Toast } from './components/toast.js';
import { ThemeModal } from './features/settings/theme_modal.js';
import { StorageHelper, StorageKeys } from '../utils/storage.js';

let dashboard;
const messageRouter = new MessageRouter();

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SHOW_TOAST') {
        const { message, type = 'info' } = msg.payload;
        if (type === 'error') Toast.error(message);
        else if (type === 'warn') Toast.warn(message);
        else if (type === 'success') Toast.success(message);
        else Toast.info(message);
    } else if (msg.type === 'SHOW_ERROR_TOAST') {
        Toast.error(msg.payload.message);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Sidepanel Loaded');

    // Initialize i18n (Must be before component init)
    await initI18n();

    // Load User Theme (Global Persistence Fix)
    await new ThemeModal().initTheme();

    // Bootstrap QS Theme System (Quiet Study appearance)
    const userSettings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
    const appearance = userSettings.appearance || {};
    const theme = appearance.theme || 'light';
    const accent = appearance.accent || 'clay';
    const density = appearance.density || 'comfortable';

    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.density = density;

    init();
});

function init() {
    const mainContent = document.getElementById('root');

    // Initialize Dashboard
    dashboard = new PreparationDashboard(mainContent, messageRouter);

    // Example: Listen for status updates
    messageRouter.on(MessageTypes.PIPELINE_STATUS_UPDATE, (payload) => {
        console.log('UI: Status Update', payload);
        // Dashboard listens to storage changes, so we might not need direct handling here
        // unless for toast notifications
    });

    // Network Status Listeners
    window.addEventListener('offline', () => {
        Toast.error(t('network.offline'));
    });
    window.addEventListener('online', () => {
        Toast.success(t('network.online'));
    });
}
