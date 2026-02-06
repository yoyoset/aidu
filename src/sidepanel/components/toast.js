/**
 * Toast - 全局轻提示组件
 * 使用: Toast.success('操作成功') / Toast.error('失败')
 */
export class Toast {
    static container = null;
    static initialized = false;

    static init() {
        if (this.initialized) return;

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        document.body.appendChild(this.container);
        this.initialized = true;
    }

    /**
     * @param {string} message - 提示文本
     * @param {'info'|'success'|'error'|'warning'} type
     * @param {number} duration - 显示时长 (ms)
     */
    static show(message, type = 'info', duration = 3000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Icon mapping for M3 Snackbar
        const icons = {
            'info': 'ri-information-line',
            'success': 'ri-checkbox-circle-line',
            'error': 'ri-error-warning-line',
            'warning': 'ri-alert-line'
        };
        const iconClass = icons[type] || icons.info;

        toast.innerHTML = `
            <i class="${iconClass}" style="font-size: 1.25rem;"></i>
            <span>${message}</span>
        `;

        this.container.appendChild(toast);

        // Auto removal logic managed by CSS animations
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -10px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static error(msg) { this.show(msg, 'error', 5000); }
    static success(msg) { this.show(msg, 'success', 2000); }
    static info(msg) { this.show(msg, 'info', 3000); }
    static warning(msg) { this.show(msg, 'warning', 4000); }
}
