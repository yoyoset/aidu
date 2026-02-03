import { ConfirmationModal } from '../sidepanel/components/confirmation_modal.js';
import { Toast } from '../sidepanel/components/toast.js';
import { logger } from './logger.js';

/**
 * NotificationService - 统一交互服务
 */
class NotificationService {
    constructor() {
        this.modal = null;
    }

    init() {
        if (!this.modal) {
            this.modal = new ConfirmationModal(document.body);
        }
    }

    /**
     * 弹出警告框 (替换 alert)
     */
    alert(message, title = '提示') {
        this.init();
        logger.info(`Alert shown: ${message}`);
        return new Promise(resolve => {
            this.modal.show({
                type: 'alert',
                title,
                message,
                confirmText: '确定',
                onConfirm: () => resolve(true)
            });
        });
    }

    /**
     * 确认框 (替换 confirm)
     */
    confirm(message, title = '请确认') {
        this.init();
        logger.info(`Confirm shown: ${message}`);
        return new Promise(resolve => {
            this.modal.show({
                type: 'confirm',
                title,
                message,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }

    /**
     * 提示输入框 (替换 prompt)
     */
    prompt(message, defaultValue = '', title = '需要输入') {
        this.init();
        logger.info(`Prompt shown: ${message}`);
        return new Promise(resolve => {
            this.modal.show({
                type: 'prompt',
                title,
                message,
                defaultValue,
                onConfirm: (val) => resolve(val),
                onCancel: () => resolve(null)
            });
        });
    }

    /**
     * 轻提示
     */
    toast(message, type = 'info') {
        Toast.show(message, type);
        logger.debug(`Toast [${type}]: ${message}`);
    }
}

export const notificationService = new NotificationService();
