function computeLocalPrediction(s) {
  let defectRate = 0;
  defectRate += Math.max(0, (s.machine.loomSpeed - 150) / 3);
  defectRate += Math.max(0, (s.thread.warpTension - 70) / 4);
  defectRate += s.environment.vibration * 8;
  defectRate += s.pattern.complexity * 12;
  defectRate = Math.min(100, Math.max(0, defectRate));

  const faultProbability = Math.min(1, defectRate / 50 + s.environment.vibration / 5);
  const anomalyScore = s.environment.vibration > 1 ? s.environment.vibration / 3 : s.pattern.complexity;
  const efficiencyScore = Math.max(0, 100 - defectRate);
  const qualityGrade = defectRate < 3 ? 'A+' : defectRate < 7 ? 'A' : defectRate < 12 ? 'B+' : defectRate < 20 ? 'B' : 'C';
  const status = defectRate < 5 ? 'safe' : defectRate < 15 ? 'warning' : 'critical';

  return { defectRate, faultProbability, anomalyScore, efficiencyScore, qualityGrade, status, recommendations: [] };
}

function PredictionPanel(container) {
  this.container = container;
  this.render();
  this.init();
}

PredictionPanel.prototype.render = function () {
  this.container.innerHTML = '<div class="pp-panel">' +
    '<div class="pp-title">ML PREDICTION</div>' +
    '<div class="pp-main-info">' +
    '<div class="pp-grade-container">' +
    '<div class="pp-grade" id="pp-grade">A</div>' +
    '<div class="pp-grade-label">Quality Grade</div>' +
    '</div>' +
    '<div class="pp-gauge-container">' +
    '<svg viewBox="0 0 100 60" class="pp-gauge">' +
    '<path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="var(--border)" stroke-width="8"/>' +
    '<path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="var(--accent2)" stroke-width="8" id="pp-gauge-fill" stroke-dasharray="126" stroke-dashoffset="126"/>' +
    '</svg>' +
    '<div class="pp-gauge-label">Defect: <span id="pp-defect-rate">0%</span></div>' +
    '</div>' +
    '</div>' +
    '<div class="pp-metrics">' +
    '<div class="pp-metric"><span class="pp-metric-label">Fault</span><span class="pp-metric-value" id="pp-fault-prob">0%</span></div>' +
    '<div class="pp-metric"><span class="pp-metric-label">Anomaly</span><span class="pp-metric-value" id="pp-anomaly">0</span></div>' +
    '<div class="pp-metric"><span class="pp-metric-label">Eff.</span><span class="pp-metric-value" id="pp-efficiency">0%</span></div>' +
    '</div>' +
    '<div class="pp-status" id="pp-status"><span class="pp-status-dot safe"></span><span class="pp-status-text">SAFE</span></div>' +
    '</div>';
};

PredictionPanel.prototype.init = function () {
  const _this = this;
  EventBus.on('prediction:updated', function (data) { _this.update(data); });
  EventBus.on('param:changed', function () { _this.runLocalPrediction(); });
  this.runLocalPrediction();
};

PredictionPanel.prototype.runLocalPrediction = function () {
  const s = state.state;
  const predictions = computeLocalPrediction(s);
  Object.assign(state.state.predictions, predictions);
  this.update(state.state.predictions);
};

PredictionPanel.prototype.update = function (data) {
  const defectRate = data.defectRate || 0;
  const qualityGrade = data.qualityGrade || 'A';
  const status = data.status || 'safe';
  const faultProbability = data.faultProbability || 0;
  const anomalyScore = data.anomalyScore || 0;
  const efficiencyScore = data.efficiencyScore || 0;

  const gradeEl = document.getElementById('pp-grade');
  if (gradeEl) {
    gradeEl.textContent = qualityGrade;
    gradeEl.className = 'pp-grade ' + (qualityGrade.startsWith('A') ? 'grade-a' : qualityGrade.startsWith('B') ? 'grade-b' : 'grade-c');
  }

  const defectEl = document.getElementById('pp-defect-rate');
  if (defectEl) defectEl.textContent = defectRate.toFixed(1) + '%';

  const gaugeEl = document.getElementById('pp-gauge-fill');
  if (gaugeEl) {
    const offset = 126 - (defectRate / 100) * 126;
    gaugeEl.setAttribute('stroke-dashoffset', offset);
    gaugeEl.style.stroke = defectRate < 5 ? 'var(--accent2)' : defectRate < 15 ? 'var(--warn)' : 'var(--fault)';
  }

  const statusEl = document.getElementById('pp-status');
  if (statusEl) {
    statusEl.className = 'pp-status ' + status;
    statusEl.innerHTML = '<span class="pp-status-dot ' + status + '"></span><span class="pp-status-text">' + status.toUpperCase() + '</span>';
  }

  const fp = document.getElementById('pp-fault-prob');
  if (fp) fp.textContent = (faultProbability * 100).toFixed(1) + '%';
  const an = document.getElementById('pp-anomaly');
  if (an) an.textContent = anomalyScore.toFixed(2);
  const ef = document.getElementById('pp-efficiency');
  if (ef) ef.textContent = efficiencyScore.toFixed(0) + '%';

  const recsEl = document.getElementById('pp-recs');
  if (recsEl && data.recommendations) {
    recsEl.innerHTML = data.recommendations.slice(0, 3).map(function (r) {
      return '<div class="pp-rec"><div class="pp-rec-param">' + r.param + '</div><div class="pp-rec-val">' + r.current + ' → ' + r.recommended + '</div></div>';
    }).join('');
  }

  if (this.lastStatus !== status) {
    if (status === 'warning' || status === 'critical') {
      const logType = status === 'critical' ? 'ALERT' : 'WARN';
      if (window.sandboxTerminal) {
        window.sandboxTerminal.log(logType, 'System entered ' + status.toUpperCase() + ' state. Model predicts potential quality anomaly.');
      }
    }
    this.lastStatus = status;
  }

  const panel = document.querySelector('.pp-panel');
  if (panel) {
    if (status === 'critical') panel.classList.add('pp-critical');
    else panel.classList.remove('pp-critical');
  }
};

window.PredictionPanel = PredictionPanel;
window.computeLocalPrediction = computeLocalPrediction;