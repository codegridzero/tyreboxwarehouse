/**
 * Application Router for Single Page Navigation
 */

export class Router {
    constructor({ routes, defaultRoute = 'dashboard', onRouteChange = null }) {
        this.routes = routes;
        this.defaultRoute = defaultRoute;
        this.onRouteChange = onRouteChange;
        this.currentRoute = null;
        this.currentParams = {};

        window.addEventListener('hashchange', () => this.handleHashChange());
    }

    init() {
        this.handleHashChange();
    }

    parseHash() {
        const hash = window.location.hash.slice(1);
        if (!hash) return { route: this.defaultRoute, params: {} };

        const [routePart, queryPart] = hash.split('?');
        const route = routePart || this.defaultRoute;
        const params = {};

        if (queryPart) {
            const pairs = queryPart.split('&');
            for (const pair of pairs) {
                const [k, v] = pair.split('=');
                if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
            }
        }

        return { route, params };
    }

    handleHashChange() {
        const { route, params } = this.parseHash();
        this.currentRoute = route;
        this.currentParams = params;

        const pageHandler = this.routes[route] || this.routes[this.defaultRoute];

        if (this.onRouteChange) {
            this.onRouteChange({
                route,
                params,
                pageHandler
            });
        }
    }

    navigate(route, params = {}) {
        let hash = `#${route}`;
        const queryParts = [];
        for (const [k, v] of Object.entries(params)) {
            if (v !== null && v !== undefined && v !== '') {
                queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
            }
        }
        if (queryParts.length > 0) {
            hash += `?${queryParts.join('&')}`;
        }
        window.location.hash = hash;
    }
}
