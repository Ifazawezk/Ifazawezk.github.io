// Keyboard and touch to game input. The game only sees { left, right, jump, action }.

const KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space', 'ArrowUp', 'KeyW'],
  action: ['KeyE', 'Enter', 'ArrowDown', 'KeyS'],
};

export function createInput({ onKey } = {}) {
  const held = new Set();
  const touch = { left: false, right: false, jump: false, action: false };
  const anyOf = (name) => KEYS[name].some((code) => held.has(code)) || touch[name];

  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target?.tagName;
    const onControl = tag === 'A' || tag === 'BUTTON';
    if (onControl && (e.code === 'Space' || e.code === 'Enter')) return;
    if (Object.values(KEYS).some((list) => list.includes(e.code))) e.preventDefault();
    held.add(e.code);
    if (!e.repeat) onKey?.(e, KEYS.action.includes(e.code));
  });
  addEventListener('keyup', (e) => held.delete(e.code));

  function bindPad(zone, onChange) {
    // One thumb per zone, and sliding across the zone changes direction.
    const update = (e) => {
      const box = zone.getBoundingClientRect();
      onChange((e.clientX - box.left) / box.width);
    };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      zone.setPointerCapture(e.pointerId);
      update(e);
    });
    zone.addEventListener('pointermove', (e) => {
      if (zone.hasPointerCapture(e.pointerId)) update(e);
    });
    const end = () => onChange(null);
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);
  }

  function bindDpad(zone) {
    bindPad(zone, (u) => {
      touch.left = u !== null && u < 0.5;
      touch.right = u !== null && u >= 0.5;
      zone.dataset.dir = touch.left ? 'left' : touch.right ? 'right' : '';
    });
  }

  function bindJump(button) {
    bindPad(button, (u) => {
      touch.jump = u !== null;
      button.classList.toggle('down', touch.jump);
    });
  }

  return {
    touch,
    bindDpad,
    bindJump,
    read() {
      return { left: anyOf('left'), right: anyOf('right'), jump: anyOf('jump'), action: anyOf('action') };
    },
    clear() {
      held.clear();
      for (const key of Object.keys(touch)) touch[key] = false;
    },
  };
}
