import './styles/main.css';
import { initI18n, t } from '../locales/index.js';
// PreparationDashboard imports its own styles now
import { PreparationDashboard } from './features/builder/preparation_dashboard.js';
import { MessageRouter, MessageTypes } from '../utils/message_router.js';
import { Toast } from './components/toast.js';

let dashboard;
const messageRouter = new MessageRouter();

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SHOW_ERROR_TOAST') {
        Toast.error(msg.payload.message);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Sidepanel Loaded');

    // Initialize i18n (Must be before component init)
    await initI18n();

    init();
});

function init() {
    const mainContent = document.getElementById('root');

    // Initialize Dashboard
    dashboard = new PreparationDashboard(mainContent);

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
