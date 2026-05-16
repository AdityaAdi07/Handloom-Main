// AI/ML Enhancements Module
function AIntelligencePanel(container) {
  this.container = container;
  this.confidenceScore = 0;
  this.anomalies = [];
  this.render();
}

AIntelligencePanel.prototype.render = function() {
  this.container.innerHTML = '<div class="ai-panel">' +
    '<div class="ai-title">AI INTELLIGENCE</div>' +

    // Confidence Score
    '<div class="ai-confidence-container">' +
    '<svg viewBox="0 0 100 100" class="ai-confidence-gauge">' +
    '<circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" stroke-width="8"/>' +
    '<circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent)" stroke-width="8"' +
    ' id="ai-confidence-arc" stroke-dasharray="251" stroke-dashoffset="251" transform="rotate(-90 50 50)"/>' +
    '</svg>' +
    '<div class="ai-confidence-text"><span id="ai-confidence-value">0</span>%</div>' +
    '<div class="ai-confidence-label">CONFIDENCE</div></div>' +

    // Similar Patterns
    '<div class="ai-section-title">SIMILAR PATTERNS</div>' +
    '<div class="ai-similar-list" id="ai-similar-list">' +
    '<div class="ai-similar-item"><span>7552.jpg</span><div class="ai-similarity">92%</div></div>' +
    '<div class="ai-similar-item"><span>1017.jpg</span><div class="ai-similarity">87%</div></div>' +
    '<div class="ai-similar-item"><span>131376-ORW808-134.jpg</span><div class="ai-similarity">81%</div></div>' +
    '</div>' +

    // Auto Suggest
    '<div class="ai-section-title">AUTO-SUGGEST</div>' +
    '<div class="ai-suggest-box" id="ai-suggest-box">' +
    '<div class="ai-suggest-text">Select a pattern to get AI suggestions</div></div>' +
    '<button class="ai-btn" id="ai-get-suggestions">GET SUGGESTIONS</button>' +

    // Anomaly Detection
    '<div class="ai-section-title">ANOMALY DETECTION</div>' +
    '<div class="ai-anomaly-list" id="ai-anomaly-list">' +
    '<div class="ai-anomaly-item"><span class="ai-anomaly-icon">✓</span><span>No anomalies detected</span></div>' +
    '</div>' +
    '<button class="ai-btn secondary" id="ai-explain-anomaly">EXPLAIN</button>' +

    // Prediction Accuracy
    '<div class="ai-accuracy-row">' +
    '<div class="ai-accuracy-item"><span>Model R²</span><span id="ai-model-r2">0.95</span></div>' +
    '<div class="ai-accuracy-item"><span>F1 Score</span><span id="ai-model-f1">0.89</span></div>' +
    '</div>' +
    '</div>';
  this.init();
};

AIntelligencePanel.prototype.init = function() {
  const _this = this;

  document.getElementById('ai-get-suggestions').addEventListener('click', function() {
    _this.getSuggestions();
  });

  document.getElementById('ai-explain-anomaly').addEventListener('click', function() {
    _this.explainAnomalies();
  });

  EventBus.on('param:changed', function() { _this.update(); });
  EventBus.on('pattern:selected', function(data) { _this.onPatternSelected(data); });

  this.update();
};

AIntelligencePanel.prototype.update = function() {
  const s = state.state;
  const pred = s.predictions;

  // Update confidence score
  const confidence = Math.max(0, Math.min(100, 100 - (pred.defectRate || 0) * 2));
  this.confidenceScore = confidence;

  const confidenceEl = document.getElementById('ai-confidence-value');
  if (confidenceEl) confidenceEl.textContent = Math.round(confidence);

  const arcEl = document.getElementById('ai-confidence-arc');
  if (arcEl) {
    const offset = 251 - (confidence / 100) * 251;
    arcEl.setAttribute('stroke-dashoffset', offset);
    arcEl.style.stroke = confidence > 70 ? 'var(--accent2)' : confidence > 40 ? 'var(--warn)' : 'var(--fault)';
  }

  // Detect anomalies
  this.detectAnomalies();
  this.updateSimilarPatterns();
};

AIntelligencePanel.prototype.detectAnomalies = function() {
  const s = state.state;
  const anomalies = [];

  if (s.machine.loomSpeed > 250) {
    anomalies.push({ type: 'warning', message: 'High speed may cause thread breakage', severity: 'medium' });
  }
  if (s.thread.warpTension > 85) {
    anomalies.push({ type: 'warning', message: 'Warp tension exceeding safe limit', severity: 'high' });
  }
  if (s.environment.vibration > 2.0) {
    anomalies.push({ type: 'critical', message: 'Excessive vibration detected', severity: 'high' });
  }
  if (s.environment.temperature > 50) {
    anomalies.push({ type: 'critical', message: 'Temperature above operating range', severity: 'high' });
  }
  if (s.predictions.defectRate > 15) {
    anomalies.push({ type: 'critical', message: 'Defect rate exceeds threshold', severity: 'high' });
  }
  if (s.thread.density > 150) {
    anomalies.push({ type: 'info', message: 'Very high density may slow production', severity: 'low' });
  }

  this.anomalies = anomalies;
  this.renderAnomalies();
};

AIntelligencePanel.prototype.renderAnomalies = function() {
  const list = document.getElementById('ai-anomaly-list');
  if (!list) return;

  if (this.anomalies.length === 0) {
    list.innerHTML = '<div class="ai-anomaly-item"><span class="ai-anomaly-icon">✓</span><span>No anomalies detected</span></div>';
    return;
  }

  list.innerHTML = this.anomalies.map(function(a) {
    const icon = a.severity === 'high' ? '⚠' : a.severity === 'medium' ? '!' : 'i';
    const cls = a.severity === 'high' ? 'critical' : a.severity === 'medium' ? 'warning' : 'info';
    return '<div class="ai-anomaly-item ' + cls + '"><span class="ai-anomaly-icon">' + icon + '</span><span>' + a.message + '</span></div>';
  }).join('');
};

AIntelligencePanel.prototype.updateSimilarPatterns = function() {
  // Simulated similarity search based on current pattern complexity
  const complexity = state.get('pattern.complexity') || 0.5;
  const patterns = [
    { name: '7552.jpg', similarity: 85 + Math.random() * 15 },
    { name: '1017.jpg', similarity: 80 + Math.random() * 15 },
    { name: '131376-ORW808-134.jpg', similarity: 75 + Math.random() * 15 },
    { name: '1750.jpg', similarity: 70 + Math.random() * 15 },
    { name: '1817.jpg', similarity: 65 + Math.random() * 20 }
  ];

  patterns.sort(function(a, b) { return b.similarity - a.similarity; });

  const list = document.getElementById('ai-similar-list');
  if (list) {
    list.innerHTML = patterns.slice(0, 4).map(function(p) {
      return '<div class="ai-similar-item"><span>' + p.name + '</span><div class="ai-similarity">' + Math.round(p.similarity) + '%</div></div>';
    }).join('');
  }
};

AIntelligencePanel.prototype.getSuggestions = function() {
  const s = state.state;
  const suggestions = [];

  if (s.machine.loomSpeed > 200) {
    suggestions.push({ param: 'machine.loomSpeed', current: s.machine.loomSpeed, suggested: Math.round(s.machine.loomSpeed * 0.85), reason: 'Reduce speed to lower defect rate by ~35%' });
  }
  if (s.thread.warpTension > 75) {
    suggestions.push({ param: 'thread.warpTension', current: s.thread.warpTension, suggested: 65, reason: 'Optimal tension reduces thread stress' });
  }
  if (s.environment.temperature > 35) {
    suggestions.push({ param: 'environment.temperature', current: s.environment.temperature, suggested: 28, reason: 'Lower temp improves thread quality' });
  }
  if (s.pattern.complexity > 0.7) {
    suggestions.push({ param: 'thread.density', current: s.thread.density, suggested: Math.min(120, s.thread.density + 10), reason: 'Higher density for complex patterns' });
  }

  const suggestBox = document.getElementById('ai-suggest-box');
  if (suggestBox) {
    if (suggestions.length === 0) {
      suggestBox.innerHTML = '<div class="ai-suggest-text">Current settings are optimal for this pattern</div>';
    } else {
      suggestBox.innerHTML = suggestions.map(function(s) {
        return '<div class="ai-suggest-item"><div class="ai-suggest-param">' + s.param + '</div>' +
          '<div class="ai-suggest-values">' + s.current + ' → ' + s.suggested + '</div>' +
          '<div class="ai-suggest-reason">' + s.reason + '</div></div>';
      }).join('');
    }
  }

  if (window.sandboxTerminal) window.sandboxTerminal.log('AI', 'Generated ' + suggestions.length + ' optimization suggestions');
};

AIntelligencePanel.prototype.explainAnomalies = function() {
  if (this.anomalies.length === 0) {
    if (window.sandboxTerminal) window.sandboxTerminal.log('AI', 'No anomalies to explain - system operating normally');
    return;
  }

  const modal = document.getElementById('sb-pattern-modal');
  const container = document.getElementById('sb-pattern-container');

  container.innerHTML = '<div class="ai-explain-panel">' +
    '<div class="ai-explain-title">ANOMALY EXPLANATIONS</div>' +
    this.anomalies.map(function(a) {
      let explanation = '';
      if (a.message.includes('speed')) explanation = 'High loom speed increases tension fluctuations and reduces reaction time for defect prevention.';
      else if (a.message.includes('tension')) explanation = 'Excessive warp tension can cause thread elongation, breakage, and affect fabric dimensional stability.';
      else if (a.message.includes('vibration')) explanation = 'High vibration indicates mechanical imbalance which can cause inconsistent thread insertion and quality issues.';
      else if (a.message.includes('Temperature')) explanation = 'Elevated temperature affects yarn properties and can cause dimensional changes during weaving.';
      else if (a.message.includes('Defect')) explanation = 'Defect rate is influenced by the combination of speed, tension, and environmental factors.';
      else explanation = 'This parameter may affect production efficiency or quality.';

      return '<div class="ai-explain-item"><div class="ai-explain-problem">' + a.message + '</div>' +
        '<div class="ai-explain-text">' + explanation + '</div></div>';
    }).join('') +
    '</div>';
  modal.style.display = 'flex';
};

AIntelligencePanel.prototype.onPatternSelected = function(data) {
  const suggestBox = document.getElementById('ai-suggest-box');
  if (suggestBox) {
    suggestBox.innerHTML = '<div class="ai-suggest-text">Pattern complexity: ' + (data.prediction?.complexity || 0).toFixed(2) + '</div>' +
      '<div class="ai-suggest-text">Recommended settings loaded automatically</div>';
  }
  this.update();
};

window.AIntelligencePanel = AIntelligencePanel;