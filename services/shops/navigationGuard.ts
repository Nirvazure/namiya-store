type Guard = { path: string; canLeave: () => boolean };
let activeGuard: Guard | undefined;

/** Install in the persistent layout before the router registers its popstate listener. */
export function installNavigationGuard() {
  function popstate(event: PopStateEvent) {
    const guard = activeGuard;
    if (!guard || window.location.pathname === guard.path || guard.canLeave()) return;
    event.stopImmediatePropagation();
    window.history.pushState(null, "", guard.path);
  }
  window.addEventListener("popstate", popstate);
  return () => window.removeEventListener("popstate", popstate);
}

export function registerNavigationGuard(guard: Guard) {
  activeGuard = guard;
  return () => { if (activeGuard === guard) activeGuard = undefined; };
}
