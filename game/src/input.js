// Ridge Runner — keyboard and mouse input.
//
// One clear job: remember what the pilot is holding, and answer the
// physics' questions about it. Edge presses (pause, mute) are consumed once.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false, wheel: 0 };
    this.pressed = new Set();
    this.canvas = canvas;
    this.attach();
  }

  attach() {
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.key.toLowerCase());
      this.keys.add(event.key.toLowerCase());
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });
    this.canvas.addEventListener('mousemove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
      this.mouse.y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
    });
    this.canvas.addEventListener('mousedown', (event) => {
      event.preventDefault();
      this.mouse.down = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    this.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.mouse.wheel += event.deltaY;
    }, { passive: false });
  }

  down(...names) {
    return names.some((name) => this.keys.has(name));
  }

  // True once, on the frame the key went down; callers consume it.
  wasPressed(...names) {
    for (const name of names) {
      if (this.pressed.has(name)) {
        this.pressed.delete(name);
        return true;
      }
    }
    return false;
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.wheel = 0;
  }

  // -1 (push down) .. +1 (pull up) from keys, or from the mouse position.
  pitchInput(planeScreenY) {
    let pitch = 0;
    if (this.down('arrowup', 'w')) pitch += 1;
    if (this.down('arrowdown', 's')) pitch -= 1;
    if (pitch !== 0) return pitch;
    if (this.mouse.down || this.mouse.x !== 0) {
      const dy = planeScreenY - this.mouse.y;
      if (Math.abs(dy) > 24) return Math.max(-1, Math.min(1, dy / 160));
    }
    return 0;
  }

  // -1 (turn left) .. +1 (turn right) from keys.
  turnInput() {
    let turn = 0;
    if (this.down('arrowleft', 'a')) turn -= 1;
    if (this.down('arrowright', 'd')) turn += 1;
    return turn;
  }

  throttleUp() {
    return this.down('shift') || this.mouse.down;
  }

  throttleDown() {
    return this.down('control');
  }

  flaps() {
    return this.down(' ');
  }

  // Mouse wheel steps since the last frame, for throttle nudges.
  wheelDelta() {
    return this.mouse.wheel;
  }
}
