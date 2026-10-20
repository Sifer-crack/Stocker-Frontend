// The tests run in plain Node: apiConfig.ts reads window.__APP_CONFIG__ at import time.
Object.assign(globalThis, { window: {} })
