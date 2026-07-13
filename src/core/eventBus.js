// Pub/sub singleton. Event names are `domain:action` (tech.md convention).

const listeners = new Map();

export const eventBus = {
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => this.off(event, fn);
  },

  off(event, fn) {
    listeners.get(event)?.delete(fn);
  },

  emit(event, payload) {
    listeners.get(event)?.forEach((fn) => fn(payload));
  },
};
