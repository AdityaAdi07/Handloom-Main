class SimulationLoop {
  constructor() {
    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDelta = 1000 / 60;
    this.handlers = [];
  }

  add(handler, priority = 0) {
    this.handlers.push({ handler, priority });
    this.handlers.sort((a, b) => a.priority - b.priority);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
  }

  loop() {
    const _this = this;
    if (!this.running) return;
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.accumulator += dt;
    while (this.accumulator >= this.fixedDelta) {
      this.fixedUpdate(this.fixedDelta);
      this.accumulator -= this.fixedDelta;
    }

    this.render(now);
    this.handlers.forEach(({ handler }) => handler(dt, now));
    requestAnimationFrame(function() { _this.loop(); });
  }

  fixedUpdate(dt) {
    if (state.get('simulation.running')) {
      state.state.simulation.elapsedTime += dt / 1000;
      
      // Add subtle jitter for reactivity
      const jitter = (Math.random() - 0.5) * 0.4;
      // Clamp values so they don't drift away
      const baseSpeed = state.get('machine.loomSpeed');
      const baseVib = state.get('environment.vibration');
      state.state.machine.loomSpeed = Math.max(0, Math.min(300, baseSpeed + jitter));
      state.state.environment.vibration = Math.max(0, Math.min(10, baseVib + jitter * 0.02));
    }
    EventBus.emit('simulation:tick', dt);
  }

  render(now) {
    EventBus.emit('simulation:render', now);
  }
}

window.simulationLoop = new SimulationLoop();