/**
 * Modal Manager Component
 */

class ModalManager {
    constructor() {
        this.container = null;
        this.activeModals = [];
    }

    ensureContainer() {
        if (!this.container) {
            this.container = document.getElementById('modal-container');
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'modal-container';
                document.body.appendChild(this.container);
            }
        }
        return this.container;
    }

    /**
     * Show a generic custom modal with title, body HTML, and action buttons
     */
    show({ title, content, size = 'max-w-lg', onOpen = null, onClose = null }) {
        const container = this.ensureContainer();

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 transition-opacity duration-200 opacity-0';

        modalOverlay.innerHTML = `
            <div class="relative bg-white rounded-xl shadow-2xl ${size} w-full max-h-[90vh] flex flex-col transform transition-transform duration-200 scale-95 overflow-hidden">
                <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 class="text-lg font-bold text-gray-900">${title}</h3>
                    <button type="button" class="modal-close-btn text-gray-400 hover:text-gray-600 rounded-lg p-1.5 inline-flex items-center justify-center focus:outline-none">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto flex-1 modal-body">
                    ${content}
                </div>
            </div>
        `;

        const closeBtn = modalOverlay.querySelector('.modal-close-btn');

        const closeModal = () => {
            modalOverlay.classList.remove('opacity-100');
            modalOverlay.querySelector('div').classList.remove('scale-100');
            modalOverlay.classList.add('opacity-0');
            modalOverlay.querySelector('div').classList.add('scale-95');
            setTimeout(() => {
                if (modalOverlay.parentNode) modalOverlay.parentNode.removeChild(modalOverlay);
                this.activeModals = this.activeModals.filter(m => m !== modalOverlay);
                if (onClose) onClose();
            }, 200);
        };

        closeBtn.addEventListener('click', closeModal);

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        // ESC key handler
        const escHandler = (e) => {
            if (e.key === 'Escape' && this.activeModals[this.activeModals.length - 1] === modalOverlay) {
                closeModal();
                window.removeEventListener('keydown', escHandler);
            }
        };
        window.addEventListener('keydown', escHandler);

        container.appendChild(modalOverlay);
        this.activeModals.push(modalOverlay);

        requestAnimationFrame(() => {
            modalOverlay.classList.remove('opacity-0');
            modalOverlay.classList.add('opacity-100');
            modalOverlay.querySelector('div').classList.remove('scale-95');
            modalOverlay.querySelector('div').classList.add('scale-100');
        });

        if (onOpen) onOpen(modalOverlay, closeModal);

        return { element: modalOverlay, close: closeModal };
    }

    /**
     * Confirmation dialog
     */
    confirm({
        title = 'Are you sure?',
        message = 'This action cannot be undone.',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        type = 'danger'
    }) {
        return new Promise((resolve) => {
            const btnColor = type === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500';

            const iconHtml = type === 'danger'
                ? `<div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                     <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                   </div>`
                : `<div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                     <svg class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                   </div>`;

            const content = `
                <div class="sm:flex sm:items-start space-x-4">
                    ${iconHtml}
                    <div class="mt-3 text-center sm:mt-0 sm:text-left flex-1">
                        <p class="text-sm text-gray-600">${message}</p>
                    </div>
                </div>
                <div class="mt-6 flex justify-end space-x-3">
                    <button type="button" id="modal-cancel-btn" class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        ${cancelText}
                    </button>
                    <button type="button" id="modal-confirm-btn" class="px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${btnColor}">
                        ${confirmText}
                    </button>
                </div>
            `;

            this.show({
                title,
                content,
                size: 'max-w-md',
                onOpen: (modalEl, close) => {
                    modalEl.querySelector('#modal-cancel-btn').addEventListener('click', () => {
                        close();
                        resolve(false);
                    });
                    modalEl.querySelector('#modal-confirm-btn').addEventListener('click', () => {
                        close();
                        resolve(true);
                    });
                },
                onClose: () => {
                    resolve(false);
                }
            });
        });
    }
}

export const modal = new ModalManager();
