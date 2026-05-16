function OptimizationEngine(container) {
  this.container = container;
  this.modes = ['quality-first', 'speed-first', 'balanced', 'low-energy'];
  this.render();
}

OptimizationEngine.prototype.render = function() {
  const _this = this;
  const modeButtons = this.modes.map(function(mode) {
    return '<button class="opt-btn" data-mode="' + mode + '">' + mode.replace('-', ' ') + '</button>';
  }).join('');

  this.container.innerHTML = '<div class="opt-panel">' +
    '<div class="opt-title">Optimization</div>' +
    '<div class="opt-modes">' + modeButtons + '</div>' +
    '<div class="opt-results" id="opt-results"></div></div>';
  this.init();
};

OptimizationEngine.prototype.init = function() {
  const _this = this;
  this.container.querySelectorAll('.opt-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { _this.runOptimization(btn.dataset.mode); });
  });
};

OptimizationEngine.prototype.runOptimization = function(mode) {
  const s = state.state;
  let recommendations = [];

  switch (mode) {
    case 'quality-first':
      if (s.machine.loomSpeed > 150) recommendations.push({ param: 'machine.loomSpeed', current: s.machine.loomSpeed, recommended: Math.round(s.machine.loomSpeed * 0.8), reason: 'reduces defects by ~40%' });
      if (s.thread.warpTension > 70) recommendations.push({ param: 'thread.warpTension', current: s.thread.warpTension, recommended: 65, reason: 'prevents thread stress' });
      if (s.environment.vibration > 1.0) recommendations.push({ param: 'environment.vibration', current: s.environment.vibration, recommended: 0.5, reason: 'reduces anomaly score' });
      break;
    case 'speed-first':
      recommendations.push({ param: 'machine.loomSpeed', current: s.machine.loomSpeed, recommended: Math.min(300, s.machine.loomSpeed + 30), reason: 'maximizes throughput' });
      if (s.thread.warpTension < 60) recommendations.push({ param: 'thread.warpTension', current: s.thread.warpTension, recommended: 65, reason: 'support higher speed' });
      break;
    case 'balanced':
      recommendations.push({ param: 'machine.loomSpeed', current: s.machine.loomSpeed, recommended: 180, reason: 'balanced speed/efficiency' });
      recommendations.push({ param: 'thread.warpTension', current: s.thread.warpTension, recommended: 65, reason: 'optimal tension' });
      break;
    case 'low-energy':
      recommendations.push({ param: 'energy.voltage', current: s.energy.voltage, recommended: 210, reason: 'reduce power consumption' });
      recommendations.push({ param: 'machine.loomSpeed', current: s.machine.loomSpeed, recommended: Math.round(s.machine.loomSpeed * 0.85), reason: '15% speed reduction' });
      recommendations.push({ param: 'environment.airflow', current: s.environment.airflow, recommended: 0.5, reason: 'reduce fan power' });
      break;
  }

  state.state.predictions.recommendations = recommendations;
  EventBus.emit('optimization:result', { recommendations: recommendations, mode: mode });
  this.displayResults(recommendations);
};

OptimizationEngine.prototype.displayResults = function(recommendations) {
  const container = document.getElementById('opt-results');
  if (!container) return;

  if (recommendations.length === 0) {
    container.innerHTML = '<div class="opt-no-change">Parameters already optimal</div>';
    return;
  }

  const _this = this;
  container.innerHTML = recommendations.map(function(rec) {
    return '<div class="opt-rec">' +
      '<div class="opt-rec-path">' + rec.param + '</div>' +
      '<div class="opt-rec-values">' + rec.current + ' → <strong>' + rec.recommended + '</strong></div>' +
      '<div class="opt-rec-reason">' + rec.reason + '</div>' +
      '<button class="opt-apply-btn" data-param="' + rec.param + '" data-value="' + rec.recommended + '">Apply</button></div>';
  }).join('');

  container.querySelectorAll('.opt-apply-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.set(btn.dataset.param, parseFloat(btn.dataset.value));
      btn.textContent = 'Applied';
      btn.disabled = true;
    });
  });
};

window.OptimizationEngine = OptimizationEngine;