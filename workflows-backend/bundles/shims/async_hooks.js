// bundles/shims/async_hooks.js
export const AsyncLocalStorage = class {
  constructor() {}
  getStore() { return null }
  run(store, fn) { fn() }
};
