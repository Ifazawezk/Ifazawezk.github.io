// localStorage can throw or vanish in private windows and strict browsers.
// Nothing in the game may depend on it, so every touch is guarded here.

const PREFIX = 'faza.';

export function makeStore(backend) {
  const area = backend === undefined ? safeArea() : backend;
  return {
    get(key, fallback = null) {
      try {
        const raw = area?.getItem(PREFIX + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      if (!area) return false;
      try {
        area.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}

function safeArea() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
