const SECTIONS = {
  MACHINE: {
    title: 'Machine',
    params: [
      { id: 'loomSpeed', label: 'Loom Speed', unit: 'RPM', min: 0, max: 300, step: 1, path: 'machine.loomSpeed', warningAbove: 220, criticalAbove: 270 },
      { id: 'targetSpeed', label: 'Target Speed', unit: 'RPM', min: 0, max: 300, step: 1, path: 'machine.targetSpeed' },
      { id: 'cycleRate', label: 'Cycle Rate', unit: 'cycles/min', min: 1, max: 200, step: 1, path: 'machine.cycleRate' },
      { id: 'operatingMode', label: 'Operating Mode', type: 'select', path: 'machine.operatingMode', options: ['auto', 'manual', 'maintenance'] },
      { id: 'motorState', label: 'Motor State', type: 'select', path: 'machine.motorState', options: ['on', 'off', 'idle'] },
      { id: 'productionMode', label: 'Production Mode', type: 'select', path: 'machine.productionMode', options: ['normal', 'high', 'eco'] },
    ]
  },
  THREAD: {
    title: 'Thread',
    params: [
      { id: 'warpTension', label: 'Warp Tension', unit: '%', min: 0, max: 100, step: 1, path: 'thread.warpTension', warningAbove: 80, criticalAbove: 90 },
      { id: 'weftTension', label: 'Weft Tension', unit: '%', min: 0, max: 100, step: 1, path: 'thread.weftTension', warningAbove: 80, criticalAbove: 90 },
      { id: 'yarnType', label: 'Yarn Type', type: 'select', path: 'thread.yarnType', options: ['cotton', 'silk', 'polyester', 'wool', 'mixed'] },
      { id: 'elasticity', label: 'Elasticity', unit: '', min: 0, max: 1, step: 0.01, path: 'thread.elasticity' },
      { id: 'density', label: 'Density', unit: 'threads/cm', min: 20, max: 200, step: 1, path: 'thread.density' },
      { id: 'thickness', label: 'Thickness', unit: 'mm', min: 0.1, max: 2.0, step: 0.1, path: 'thread.thickness' },
    ]
  },
  ENVIRONMENT: {
    title: 'Environment',
    params: [
      { id: 'temperature', label: 'Temperature', unit: '°C', min: 10, max: 60, step: 1, path: 'environment.temperature', warningAbove: 45, criticalAbove: 55 },
      { id: 'humidity', label: 'Humidity', unit: '%', min: 10, max: 100, step: 1, path: 'environment.humidity', warningAbove: 80, criticalAbove: 90 },
      { id: 'vibration', label: 'Vibration', unit: 'g', min: 0, max: 5.0, step: 0.1, path: 'environment.vibration', warningAbove: 1.0, criticalAbove: 3.0 },
      { id: 'airflow', label: 'Airflow', unit: 'm/s', min: 0, max: 10, step: 0.1, path: 'environment.airflow' },
    ]
  },
  ENERGY: {
    title: 'Energy',
    params: [
      { id: 'voltage', label: 'Voltage', unit: 'V', min: 180, max: 260, step: 1, path: 'energy.voltage' },
      { id: 'current', label: 'Current', unit: 'A', min: 0, max: 20, step: 0.1, path: 'energy.current' },
      { id: 'powerDisplay', label: 'Power', unit: 'W', readonly: true, path: 'energy.powerConsumption' },
    ]
  },
  PRODUCTION: {
    title: 'Production',
    params: [
      { id: 'defectThreshold', label: 'Defect Threshold', unit: '%', min: 0, max: 30, step: 1, path: 'production.defectThreshold' },
      { id: 'efficiencyTarget', label: 'Efficiency Target', unit: '%', min: 50, max: 100, step: 1, path: 'production.efficiencyTarget' },
      { id: 'qualityTolerance', label: 'Quality Tolerance', type: 'select', path: 'production.qualityTolerance', options: ['low', 'medium', 'high', 'ultra'] },
    ]
  },
  PATTERN: {
    title: 'Pattern',
    params: [
      { id: 'complexity', label: 'Complexity', unit: '', min: 0, max: 1, step: 0.01, path: 'pattern.complexity' },
      { id: 'insertionRate', label: 'Insertion Rate', unit: 'picks/min', min: 10, max: 200, step: 1, path: 'pattern.insertionRate' },
      { id: 'weaveDensity', label: 'Weave Density', unit: 'picks/cm', min: 10, max: 200, step: 1, path: 'pattern.weaveDensity' },
    ]
  },
  FABRIC: {
    title: 'Fabric Size',
    params: [
      { id: 'sareeLength', label: 'Saree Length', unit: 'm', min: 1, max: 10, step: 0.1, path: 'fabric.sareeLength' },
      { id: 'sareeWidth', label: 'Saree Width', unit: 'm', min: 0.5, max: 2, step: 0.1, path: 'fabric.sareeWidth' },
      { id: 'customDensity', label: 'Custom Density', unit: 'picks/cm', min: 10, max: 200, step: 1, path: 'fabric.customDensity' },
      { id: 'customComplexity', label: 'Custom Complexity', unit: '', min: 0, max: 1, step: 0.01, path: 'fabric.customComplexity' },
    ]
  },
  FAULTS: {
    title: 'Fault Injection',
    params: [
      { id: 'faultType', label: 'Fault Type', type: 'select', path: 'simulation.faultType', options: ['none', 'thread_break', 'motor_fault', 'power_spike'] },
    ]
  }
};

function ControlPanel(container) {
  this.container = container;
  this.collapsed = {
    THREAD: true,
    ENVIRONMENT: true,
    ENERGY: true,
    PRODUCTION: true,
    PATTERN: true,
    FABRIC: true,
    FAULTS: true
  };
  this.render();
  this.init();
}

ControlPanel.prototype.render = function() {
  const _this = this;
  this.container.innerHTML = '';
  Object.keys(SECTIONS).forEach(function(key) {
    const section = SECTIONS[key];
    const sectionEl = _this.createSection(key, section);
    _this.container.appendChild(sectionEl);
  });
};

ControlPanel.prototype.createSection = function(key, section) {
  const _this = this;
  const collapsed = this.collapsed[key];
  const div = document.createElement('div');
  div.className = 'sb-section';
  div.innerHTML = '<div class="sb-section-header ' + (collapsed ? 'collapsed' : '') + '" data-key="' + key + '">' +
    '<span>' + section.title + '</span>' +
    '<span class="sb-chevron">' + (collapsed ? '▶' : '▼') + '</span>' +
    '</div>' +
    '<div class="sb-section-content ' + (collapsed ? 'hidden' : '') + '">' +
    section.params.map(function(p) { return _this.createControl(p); }).join('') +
    '</div>';

  div.querySelector('.sb-section-header').addEventListener('click', function() {
    _this.collapsed[key] = !_this.collapsed[key];
    const content = div.querySelector('.sb-section-content');
    const chevron = div.querySelector('.sb-chevron');
    content.classList.toggle('hidden');
    chevron.textContent = _this.collapsed[key] ? '▶' : '▼';
    div.querySelector('.sb-section-header').classList.toggle('collapsed', _this.collapsed[key]);
  });

  return div;
};

ControlPanel.prototype.createControl = function(param) {
  const value = state.get(param.path);
  let control = '';

  if (param.readonly) {
    control = '<div class="sb-value-display" id="val-' + param.id + '">' + (value || 0) + ' ' + (param.unit || '') + '</div>';
  } else if (param.type === 'select') {
    control = '<select class="sb-select" data-path="' + param.path + '">' +
      param.options.map(function(o) { return '<option value="' + o + '"' + (value === o ? ' selected' : '') + '>' + o.toUpperCase() + '</option>'; }).join('') +
      '</select>';
  } else {
    const pct = ((value - param.min) / (param.max - param.min)) * 100;
    control = '<input type="range" class="sb-slider" data-path="' + param.path + '" ' +
      'min="' + param.min + '" max="' + param.max + '" step="' + (param.step || 1) + '" value="' + value + '" ' +
      'style="background: linear-gradient(to right, var(--accent) 0%, var(--accent) ' + pct + '%, var(--border) ' + pct + '%, var(--border) 100%);">';
  }

  return '<div class="sb-control">' +
    '<label>' + param.label + '</label>' +
    control +
    '<div class="sb-range">' + param.min + ' — ' + param.max + ' ' + (param.unit || '') + '</div>' +
    '<div class="sb-value" id="disp-' + param.id + '">' + value + ' ' + (param.unit || '') + '</div>' +
    '</div>';
};

ControlPanel.prototype.init = function() {
  const _this = this;

  this.container.querySelectorAll('.sb-slider').forEach(function(slider) {
    slider.addEventListener('input', function(e) {
      const path = e.target.dataset.path;
      const value = parseFloat(e.target.value);
      state.set(path, value);
      _this.updateDisplay(path, value, e.target);
    });
  });

  this.container.querySelectorAll('.sb-select').forEach(function(select) {
    select.addEventListener('change', function(e) {
      const path = e.target.dataset.path;
      state.set(path, e.target.value);
    });
  });

  Object.values(SECTIONS).forEach(function(section) {
    section.params.forEach(function(param) {
      EventBus.on('param:' + param.path, function(data) {
        _this.updateDisplay(param.path, data.new);
      });
    });
  });
};

ControlPanel.prototype.updateDisplay = function(path, value, slider) {
  const param = Object.values(SECTIONS).flatMap(function(s) { return s.params; }).find(function(p) { return p.path === path; });
  if (!param) return;

  const display = document.getElementById('disp-' + param.id);
  if (display) {
    display.textContent = value + ' ' + (param.unit || '');
    display.className = 'sb-value ' + this.getStatusClass(value, param);
  }

  if (slider) {
    const pct = ((value - param.min) / (param.max - param.min)) * 100;
    slider.style.background = 'linear-gradient(to right, var(--accent) 0%, var(--accent) ' + pct + '%, var(--border) ' + pct + '%, var(--border) 100%)';
  }
};

ControlPanel.prototype.getStatusClass = function(value, param) {
  if (param.criticalAbove && value >= param.criticalAbove) return 'critical';
  if (param.warningAbove && value >= param.warningAbove) return 'warning';
  return '';
};

window.ControlPanel = ControlPanel;