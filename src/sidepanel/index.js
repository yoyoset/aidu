import './styles/main.css';
// PreparationDashboard imports its own styles now
import { PreparationDashboard } from './features/builder/preparation_dashboard.js';
import { MessageRouter, MessageTypes } from '../utils/message_router.js';

let dashboard;
const messageRouter = new MessageRouter();

document.addEventListener('DOMContentLoaded', () => {
    console.log('Sidepanel Loaded');
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
}
