/**
 * Toast Notification Component
 */

class ToastManager {
    constructor() {
        this.container = null;
    }

    ensureContainer() {
        if (!this.container) {
            this.container = document.getElementById('toast-container');
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'toast-container';
                this.container.className = 'fixed bottom-5 right-5 z-50 flex flex-col-reverse space-y-reverse space-y-2.5 pointer-events-none';
                document.body.appendChild(this.container);
            }
        }
        return this.container;
    }

    show(message, type = 'info', duration = 3500) {
        const container = this.ensureContainer();

        const toast = document.createElement('div');
        toast.className = `pointer-events-auto flex items-center p-4 w-full max-w-sm rounded-lg shadow-lg border transition-all duration-300 transform translate-y-[10px] opacity-0 ${this.getTypeStyles(type)}`;

        const iconSvg = this.getIcon(type);

        toast.innerHTML = `
            <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${this.getIconContainerStyles(type)}">
                ${iconSvg}
            </div>
            <div class="ml-3 text-sm font-medium pr-2 text-gray-900">${message}</div>
            <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-transparent text-gray-400 hover:text-gray-900 rounded-lg p-1.5 inline-flex h-8 w-8 items-center justify-center focus:outline-none" aria-label="Close">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
            </button>
        `;

        const closeBtn = toast.querySelector('button');
        const removeToast = () => {
            toast.classList.add('opacity-0', 'translate-y-[10px]');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        };

        closeBtn.addEventListener('click', removeToast);

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', 'translate-y-[10px]');
            toast.classList.add('opacity-100', 'translate-y-0');
        });

        // Auto remove
        if (duration > 0) {
            setTimeout(removeToast, duration);
        }
    }

    success(message, duration) {
        this.show(message, 'success', duration);
    }

    error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    warning(message, duration = 4500) {
        this.show(message, 'warning', duration);
    }

    info(message, duration) {
        this.show(message, 'info', duration);
    }

    getTypeStyles(type) {
        switch (type) {
            case 'success':
                return 'bg-white border-green-200';
            case 'error':
                return 'bg-white border-red-200';
            case 'warning':
                return 'bg-white border-yellow-200';
            case 'info':
            default:
                return 'bg-white border-blue-200';
        }
    }

    getIconContainerStyles(type) {
        switch (type) {
            case 'success':
                return 'text-green-600 bg-green-100';
            case 'error':
                return 'text-red-600 bg-red-100';
            case 'warning':
                return 'text-yellow-600 bg-yellow-100';
            case 'info':
            default:
                return 'text-blue-600 bg-blue-100';
        }
    }

    getIcon(type) {
        switch (type) {
            case 'success':
                return `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>`;
            case 'error':
                return `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>`;
            case 'warning':
                return `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>`;
            case 'info':
            default:
                return `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>`;
        }
    }
}

export const toast = new ToastManager();
