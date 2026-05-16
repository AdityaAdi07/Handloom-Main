// Analytics & Reports Module
function AnalyticsEngine(container) {
  this.container = container;
  this.costData = {
    threadCostPerMeter: { cotton: 0.5, silk: 2.5, polyester: 0.3, wool: 1.2, mixed: 0.8 },
    energyCostPerKwh: 0.12,
    laborCostPerHour: 5,
  };
  this.history = [];
  this.maxHistory = 100;
  this.render();
}

AnalyticsEngine.prototype.render = function() {
  this.container.innerHTML = '<div class="ana-panel">' +
    '<div class="ana-title">ANALYTICS & REPORTS</div>' +

    // Quick Stats Row
    '<div class="ana-stats-grid">' +
    '<div class="ana-stat-card"><div class="ana-stat-label">Total Cost</div><div class="ana-stat-value" id="ana-total-cost">$0.00</div></div>' +
    '<div class="ana-stat-card"><div class="ana-stat-label">Efficiency</div><div class="ana-stat-value" id="ana-eff-score">0%</div></div>' +
    '<div class="ana-stat-card"><div class="ana-stat-label">Quality</div><div class="ana-stat-value" id="ana-quality-score">A</div></div>' +
    '<div class="ana-stat-card"><div class="ana-stat-label">Defects</div><div class="ana-stat-value" id="ana-defect-count">0</div></div>' +
    '</div>' +

    // Cost Breakdown
    '<div class="ana-section-title">COST BREAKDOWN</div>' +
    '<div class="ana-cost-bars">' +
    '<div class="ana-cost-row"><span>Thread</span><div class="ana-bar-container"><div class="ana-bar" id="ana-bar-thread" style="width:0%"></div></div><span id="ana-cost-thread">$0</span></div>' +
    '<div class="ana-cost-row"><span>Energy</span><div class="ana-bar-container"><div class="ana-bar" style="background:var(--warn)"></div></div><span id="ana-cost-energy">$0</span></div>' +
    '<div class="ana-cost-row"><span>Labor</span><div class="ana-bar-container"><div class="ana-bar" style="background:var(--accent2)"></div></div><span id="ana-cost-labor">$0</span></div>' +
    '</div>' +

    // Actions
    '<div class="ana-actions">' +
    '<button class="ana-btn" id="ana-export-csv">EXPORT CSV</button>' +
    '<button class="ana-btn" id="ana-export-pdf">EXPORT PDF</button>' +
    '<button class="ana-btn" id="ana-save-snapshot">SAVE SNAPSHOT</button>' +
    '</div>' +

    // Defect Heatmap Preview
    '<div class="ana-section-title">DEFECT DISTRIBUTION</div>' +
    '<div class="ana-heatmap-preview" id="ana-heatmap-preview">' +
    '<div class="ana-heatmap-placeholder">Click to view full heatmap</div></div>' +

    // History Chart
    '<div class="ana-section-title">HISTORY</div>' +
    '<canvas id="ana-history-chart" class="ana-chart"></canvas>' +
    '</div>';
  this.init();
};

AnalyticsEngine.prototype.init = function() {
  const _this = this;

  document.getElementById('ana-export-csv').addEventListener('click', function() { _this.exportCSV(); });
  document.getElementById('ana-export-pdf').addEventListener('click', function() { _this.exportPDF(); });
  document.getElementById('ana-save-snapshot').addEventListener('click', function() { _this.saveSnapshot(); });
  document.getElementById('ana-heatmap-preview').addEventListener('click', function() { _this.showHeatmapModal(); });

  EventBus.on('param:changed', function() { _this.update(); });
  EventBus.on('simulation:tick', function() { _this.update(); });

  this.update();
  this.updateHistoryChart();
};

AnalyticsEngine.prototype.update = function() {
  const s = state.state;
  const est = s.estimation;
  const pred = s.predictions;

  // Calculate costs
  const threadType = s.thread.yarnType || 'cotton';
  const threadCostPerMeter = this.costData.threadCostPerMeter[threadType] || 0.5;
  const threadCost = (est.threadConsumptionM / 1000) * threadCostPerMeter;
  const energyCost = est.energyConsumptionKWh * this.costData.energyCostPerKwh;
  const laborCost = est.weavingTimeHours * this.costData.laborCostPerHour;
  const totalCost = threadCost + energyCost + laborCost;

  // Update display
  document.getElementById('ana-total-cost').textContent = '$' + totalCost.toFixed(2);
  document.getElementById('ana-eff-score').textContent = (est.productionEfficiency || 0) + '%';
  document.getElementById('ana-quality-score').textContent = pred.qualityGrade || 'A';
  document.getElementById('ana-defect-count').textContent = Math.round((pred.defectRate || 0) * 10);

  // Cost bars
  if (totalCost > 0) {
    document.getElementById('ana-bar-thread').style.width = (threadCost / totalCost * 100) + '%';
    document.getElementById('ana-cost-thread').textContent = '$' + threadCost.toFixed(2);
    document.getElementById('ana-cost-energy').textContent = '$' + energyCost.toFixed(2);
    document.getElementById('ana-cost-labor').textContent = '$' + laborCost.toFixed(2);
  }
};

AnalyticsEngine.prototype.saveSnapshot = function() {
  const snapshot = {
    timestamp: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(state.state)),
    estimation: JSON.parse(JSON.stringify(state.state.estimation))
  };
  this.history.push(snapshot);
  if (this.history.length > this.maxHistory) this.history.shift();
  this.updateHistoryChart();
  if (window.sandboxTerminal) window.sandboxTerminal.log('SYSTEM', 'Snapshot saved #' + this.history.length);
};

AnalyticsEngine.prototype.updateHistoryChart = function() {
  const canvas = document.getElementById('ana-history-chart');
  if (!canvas || !this.history.length) return;

  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 80;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'var(--accent)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  const data = this.history.map(function(s) { return s.estimation.productionEfficiency || 0; });
  data.forEach(function(val, i) {
    const x = (i / (data.length - 1)) * canvas.width;
    const y = canvas.height - (val / 100) * canvas.height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
};

AnalyticsEngine.prototype.exportCSV = function() {
  const s = state.state;
  const est = s.estimation;
  let csv = 'Parameter,Value\n';
  csv += 'Speed,' + s.machine.loomSpeed + ' RPM\n';
  csv += 'Warp Tension,' + s.thread.warpTension + '%\n';
  csv += 'Weft Tension,' + s.thread.weftTension + '%\n';
  csv += 'Density,' + s.thread.density + ' threads/cm\n';
  csv += 'Temperature,' + s.environment.temperature + ' C\n';
  csv += 'Vibration,' + s.environment.vibration + ' g\n';
  csv += 'Weaving Time,' + est.weavingTimeHours + ' hours\n';
  csv += 'Thread Required,' + est.threadConsumptionM + ' meters\n';
  csv += 'Energy,' + est.energyConsumptionKWh + ' kWh\n';
  csv += 'Defect Rate,' + s.predictions.defectRate + '%\n';
  csv += 'Quality Grade,' + s.predictions.qualityGrade + '\n';
  csv += 'Efficiency,' + est.productionEfficiency + '%\n';

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sandbox_report_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);

  if (window.sandboxTerminal) window.sandboxTerminal.log('SYSTEM', 'Report exported as CSV');
};

AnalyticsEngine.prototype.exportPDF = function() {
  // Create a simple HTML report for printing
  const s = state.state;
  const est = s.estimation;
  const html = '<html><head><title>Sandbox Report</title></head><body>' +
    '<h1>Sandbox Simulation Report</h1>' +
    '<p>Generated: ' + new Date().toLocaleString() + '</p>' +
    '<h2>Machine Settings</h2>' +
    '<table><tr><td>Speed</td><td>' + s.machine.loomSpeed + ' RPM</td></tr>' +
    '<tr><td>Warp Tension</td><td>' + s.thread.warpTension + '%</td></tr>' +
    '<tr><td>Weft Tension</td><td>' + s.thread.weftTension + '%</td></tr></table>' +
    '<h2>Estimation</h2>' +
    '<table><tr><td>Weaving Time</td><td>' + est.weavingTimeHours + ' hours</td></tr>' +
    '<tr><td>Thread Required</td><td>' + est.threadConsumptionM + ' meters</td></tr>' +
    '<tr><td>Energy</td><td>' + est.energyConsumptionKWh + ' kWh</td></tr></table>' +
    '<h2>Predictions</h2>' +
    '<table><tr><td>Defect Rate</td><td>' + s.predictions.defectRate + '%</td></tr>' +
    '<tr><td>Quality Grade</td><td>' + s.predictions.qualityGrade + '</td></tr>' +
    '<tr><td>Efficiency</td><td>' + est.productionEfficiency + '%</td></tr></table>' +
    '<script>window.print();<\/script></body></html>';

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();

  if (window.sandboxTerminal) window.sandboxTerminal.log('SYSTEM', 'Report opened for PDF printing');
};

AnalyticsEngine.prototype.showHeatmapModal = function() {
  const modal = document.getElementById('sb-pattern-modal');
  const container = document.getElementById('sb-pattern-container');

  container.innerHTML = '<div class="ana-heatmap-full">' +
    '<div class="ana-heatmap-title">DEFECT HEATMAP</div>' +
    '<canvas id="ana-heatmap-canvas" width="400" height="300"></canvas>' +
    '<div class="ana-heatmap-legend">' +
    '<span>Low</span><div class="ana-legend-gradient"></div><span>High</span>' +
    '</div></div>';
  modal.style.display = 'flex';

  this.renderHeatmap();
};

AnalyticsEngine.prototype.renderHeatmap = function() {
  const canvas = document.getElementById('ana-heatmap-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const s = state.state;

  // Generate simulated defect map
  const defectRate = s.predictions.defectRate || 0;
  const complexity = s.pattern.complexity || 0.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Simulate defect clusters
      const noise = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.5 + 0.5;
      const cluster = Math.random() < (defectRate / 100) * 0.3 ? 1 : 0;
      const value = Math.min(1, (noise * complexity + cluster) * defectRate / 100);

      // Color: green -> yellow -> red
      let r, g, b;
      if (value < 0.5) {
        r = Math.round(value * 2 * 255);
        g = 255;
        b = 0;
      } else {
        r = 255;
        g = Math.round((1 - (value - 0.5) * 2) * 255);
        b = 0;
      }
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fillRect(x, y, 1, 1);
    }
  }
};

window.AnalyticsEngine = AnalyticsEngine;