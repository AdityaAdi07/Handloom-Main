const PRESETS = {
  cotton_saree: {
    name: 'Cotton',
    machine: { loomSpeed: 140, cycleRate: 70, productionMode: 'normal' },
    thread: { yarnType: 'cotton', warpTension: 65, weftTension: 60, thickness: 0.4, density: 80 },
    environment: { temperature: 28, humidity: 55 },
    pattern: { complexity: 0.4, weaveDensity: 80 }
  },
  silk_mode: {
    name: 'Silk',
    machine: { loomSpeed: 80, cycleRate: 40, productionMode: 'eco' },
    thread: { yarnType: 'silk', warpTension: 45, weftTension: 40, thickness: 0.1, elasticity: 0.7 },
    environment: { humidity: 65 }
  },
  high_speed: {
    name: 'High Speed',
    machine: { loomSpeed: 260, cycleRate: 130, productionMode: 'high' },
    thread: { warpTension: 75, weftTension: 72 },
    environment: { vibration: 1.5, temperature: 35 }
  },
  fault_simulation: {
    name: 'Fault Sim',
    machine: { loomSpeed: 260, cycleRate: 130 },
    thread: { warpTension: 92, weftTension: 88 },
    environment: { vibration: 3.5, temperature: 52 },
    energy: { voltage: 248, current: 16 },
    simulation: { faultInjected: true, faultType: 'thread_break' }
  },
  low_tension: {
    name: 'Low Tension',
    machine: { loomSpeed: 100 },
    thread: { warpTension: 35, weftTension: 30, elasticity: 0.6 }
  },
  high_humidity: {
    name: 'High Humidity',
    environment: { humidity: 88, temperature: 32 }
  },
  power_instability: {
    name: 'Power Issue',
    energy: { voltage: 195, current: 3.8 },
    machine: { loomSpeed: 110 }
  }
};

function PresetManager(container) {
  this.container = container;
  this.render();
}

PresetManager.prototype.render = function() {
  const _this = this;
  let buttons = Object.keys(PRESETS).map(function(key) {
    const preset = PRESETS[key];
    return '<button class="preset-btn" data-preset="' + key + '">' + preset.name + '</button>';
  }).join('');

  this.container.innerHTML = '<div class="preset-bar"><span class="preset-label">PRESETS:</span>' + buttons + '</div>';

  this.container.querySelectorAll('.preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { _this.applyPreset(btn.dataset.preset); });
  });
};

PresetManager.prototype.applyPreset = function(name) {
  const preset = PRESETS[name];
  if (!preset) return;

  this.container.querySelectorAll('.preset-btn').forEach(function(b) { b.classList.remove('active'); });
  var activeBtn = this.container.querySelector('[data-preset="' + name + '"]');
  if (activeBtn) activeBtn.classList.add('active');

  Object.entries(preset).forEach(function(entry) {
    const section = entry[0];
    const values = entry[1];
    Object.entries(values).forEach(function(v) {
      state.set(section + '.' + v[0], v[1]);
    });
  });

  state.set('simulation.activePreset', name);
  EventBus.emit('state:preset:' + name, preset);
};

window.PresetManager = PresetManager;
window.PRESETS = PRESETS;