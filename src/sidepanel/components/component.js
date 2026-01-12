/**
 * UI Component Base Class
 * Enforces explicit context injection.
 */
export class Component {
    constructor(element) {
        this.element = element;
    }

    render(data) {
        throw new Error('Render method must be implemented');
    }

    show() {
        this.element.classList.remove('hidden');
    }

    hide() {
        this.element.classList.add('hidden');
    }

    clear() {
        this.element.textContent = '';
    }
}
