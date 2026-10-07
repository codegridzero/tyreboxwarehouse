/**
 * Application Sidebar Navigation Component
 */

export const sidebarComponent = {
    render(activeRoute = 'dashboard') {
        const navItems = [
            {
                section: 'OVERVIEW',
                items: [
                    { route: 'dashboard', label: 'Dashboard', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>` }
                ]
            },
            {
                section: 'DAILY OPERATIONS',
                items: [
                    { route: 'daily-control', label: 'Daily Operations', badge: '3-Truck', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>` },
                    { route: 'loading', label: 'Morning Loading', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>` },
                    { route: 'sales', label: 'Sales Entry', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>` },
                    { route: 'returns', label: 'Evening Return', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>` }
                ]
            },
            {
                section: 'INVENTORY & MASTER DATA',
                items: [
                    { route: 'inventory', label: 'Warehouse Stock', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>` },
                    { route: 'products', label: 'Products & Categories', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>` },
                    { route: 'trucks', label: 'Trucks & Drivers', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7h-3v5h4.05a2.5 2.5 0 014.9 0H20a1 1 0 001-1v-3.586a1 1 0 00-.293-.707l-2.414-2.414A1 1 0 0017.586 4H14v3z"/>` }
                ]
            },
            {
                section: 'INTELLIGENCE & REPORTS',
                items: [
                    { route: 'reports', label: 'Reports & Audits', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>` },
                    { route: 'settings', label: 'Backup & Settings', icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>` }
                ]
            }
        ];

        let navHtml = '';

        navItems.forEach(group => {
            navHtml += `
                <div class="px-3 py-2">
                    <p class="px-3 text-[10px] font-bold tracking-wider text-gray-400 uppercase">${group.section}</p>
                    <div class="mt-1 space-y-1">
            `;

            group.items.forEach(item => {
                const isActive = activeRoute === item.route;
                const activeClass = isActive
                    ? 'nav-item-active text-sky-400 bg-slate-800 font-semibold'
                    : 'text-gray-300 hover:bg-slate-800 hover:text-white';

                const badgeHtml = item.badge
                    ? `<span class="ml-auto inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-900 text-sky-200">${item.badge}</span>`
                    : '';

                navHtml += `
                    <a href="#${item.route}" class="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 ${activeClass}">
                        <svg class="mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-sky-400' : 'text-gray-400'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            ${item.icon}
                        </svg>
                        <span class="truncate">${item.label}</span>
                        ${badgeHtml}
                    </a>
                `;
            });

            navHtml += `
                    </div>
                </div>
            `;
        });

        return `
            <div class="flex flex-col h-full bg-slate-900 text-white w-64 shadow-xl select-none">
                <!-- Brand Header -->
                <div class="flex items-center justify-between px-4 py-4 border-b border-slate-800">
                    <div class="flex items-center space-x-3">
                        <div class="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                            </svg>
                        </div>
                        <div>
                            <h1 class="text-sm font-bold tracking-wide text-white leading-tight">TIRE & TUBE WMS</h1>
                            <p class="text-[11px] text-slate-400 font-medium">Inventory & Truck Sales</p>
                        </div>
                    </div>
                </div>

                <!-- Navigation List -->
                <nav class="flex-1 py-3 overflow-y-auto space-y-2">
                    ${navHtml}
                </nav>

                <!-- Footer Status -->
                <div class="p-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-400 flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span class="font-medium text-slate-300">SQLite WASM Local</span>
                    </div>
                    <span class="text-[10px] text-slate-400 font-mono">v1.0.0</span>
                </div>
            </div>
        `;
    }
};
