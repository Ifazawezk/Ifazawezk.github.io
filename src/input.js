// Keyboard to game input. The game only ever sees { left, right, jump, action }.

const KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space', 'ArrowUp', 'KeyW'],
  action: ['KeyE', 'Enter', 'ArrowDown', 'KeyS'],
};

export function createInput(onFirstKey) {
  const held = new Set();
  const touch = { left: false, right: false, jump: false, action: false };

  const anyOf = (name) => KEYS[name].some((code) => held.has(code)) || touch[name];

  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const known = Object.values(KEYS).some((list) => list.includes(e.code));
    if (known) {
      const tag = e.target?.tagName;
      const onControl = tag === 'A' || tag === 'BUTTON';
      if (onControl && (e.code === 'Space' || e.code === 'Enter')) return;
      e.preventDefault();
    }
    held.add(e.code);
    onFirstKey?.(e);
  });
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => held.clear());

  return {
    touch,
    read() {
      return { left: anyOf('left'), right: anyOf('right'), jump: anyOf('jump'), action: anyOf('action') };
    },
    clear() {
      held.clear();
      for (const key of Object.keys(touch)) touch[key] = false;
    },
  };
}
