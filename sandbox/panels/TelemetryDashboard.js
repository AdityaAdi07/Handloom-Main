function TelemetryDashboard(container) {
  this.container = container;
  this.charts = {};
  this.maxPoints = 60;
  this.render();
}

TelemetryDashboard.prototype.render = function() {
  this.container.innerHTML = '<div class="telem-grid">' +
    '<div class="telem-chart"><div class="telem-title">SPEED (RPM)</div><canvas id="chart-speed"></canvas></div>' +
    '<div class="telem-chart"><div class="telem-title">VIBRATION (g)</div><canvas id="chart-vibration"></canvas></div>' +
    '<div class="telem-chart"><div class="telem-title">POWER (W)</div><canvas id="chart-power"></canvas></div>' +
    '<div class="telem-chart"><div class="telem-title">TENSION (%)</div><canvas id="chart-tension"></canvas></div>' +
    '<div class="telem-chart"><div class="telem-title">DEFECT RATE (%)</div><canvas id="chart-defect"></canvas></div>' +
    '<div class="telem-chart"><div class="telem-title">ANOMALY</div><canvas id="chart-anomaly"></canvas></div>' +
    '</div>';
  this.init();
};

TelemetryDashboard.prototype.init = function() {
  const _this = this;
  ['speed', 'vibration', 'power', 'tension', 'defect', 'anomaly'].forEach(function(key) {
    const canvas = document.getElementById('chart-' + key);
    if (canvas) {
      _this.charts[key] = { canvas: canvas, ctx: canvas.getContext('2d'), data: [] };
    }
  });

  this.tickCount = 0;
  EventBus.on('simulation:tick', function() {
    _this.tickCount++;
    if (_this.tickCount % 6 === 0) { // Update at ~10Hz instead of 60Hz
      _this.update();
    }
  });
  EventBus.on('prediction:updated', function() { _this.update(); });
};

TelemetryDashboard.prototype.update = function() {
  const s = state.state;
  const jitter = (amp) => (Math.random() - 0.5) * amp;

  this.push('speed', s.machine.loomSpeed + jitter(5));
  this.push('vibration', s.environment.vibration + jitter(0.15));
  this.push('power', s.energy.powerConsumption + jitter(40));
  this.push('tension', s.thread.warpTension + jitter(1.8));
  this.push('defect', (s.predictions.defectRate || 0) + jitter(1));
  this.push('anomaly', (s.predictions.anomalyScore || 0) + jitter(0.02));

  Object.entries(this.charts).forEach(function([key, chart]) {
    this.renderChart(key, chart);
  }.bind(this));
};

TelemetryDashboard.prototype.push = function(key, value) {
  if (!this.charts[key]) return;
  this.charts[key].data.push(value);
  if (this.charts[key].data.length > this.maxPoints) {
    this.charts[key].data.shift();
  }
};

TelemetryDashboard.prototype.renderChart = function(key, chart) {
  const canvas = chart.canvas;
  const ctx = chart.ctx;
  const data = chart.data;
  if (!canvas || !data.length) return;

  const max = this.getMax(key);

  const w = canvas.parentElement.clientWidth;
  const h = 40;
  canvas.width = w;
  canvas.height = h;

  const threshold = this.getThreshold(key);
  const isCritical = data[data.length - 1] > threshold;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = isCritical ? '#ff3040' : '#00d4ff';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = isCritical ? '#ff3040' : '#00d4ff';
  ctx.shadowBlur = 4;
  ctx.beginPath();

  data.forEach(function(val, i) {
    const x = (i / (this.maxPoints - 1)) * w;
    const norm = Math.min(1, val / max);
    const y = h - norm * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }.bind(this));

  ctx.stroke();
};

TelemetryDashboard.prototype.getThreshold = function(key) {
  const thresholds = { speed: 170, vibration: 0.8, power: 1200, tension: 9, defect: 40, anomaly: 0.7 };
  return thresholds[key] || 10000;
};

TelemetryDashboard.prototype.getMax = function(key) {
  const maxes = { speed: 300, vibration: 5, power: 5200, tension: 100, defect: 100, anomaly: 1 };
  return maxes[key] || 100;
};

window.TelemetryDashboard = TelemetryDashboard;