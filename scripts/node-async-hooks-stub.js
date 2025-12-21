// Stub for node:async_hooks - not available in Cloudflare Workers
export class AsyncLocalStorage {
  constructor() {}
  run(store, callback) {
    return callback();
  }
  getStore() {
    return undefined;
  }
  enterWith(store) {}
  disable() {}
  exit(callback) {
    return callback();
  }
}

