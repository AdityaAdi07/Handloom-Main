function FabricSizeEstimator(container) {
  this.container = container;
  this.render();
}

FabricSizeEstimator.prototype.render = function() {
  this.container.innerHTML = '<div class="fabric-estimator">' +
    '<div class="fabric-title">Fabric Size Estimation</div>' +
    '<div class="fabric-metrics">' +
    '<div class="fabric-metric"><span class="fabric-metric-label">Weaving Time</span><span class="fabric-metric-value" id="fe-time">0h</span></div>' +
    '<div class="fabric-metric"><span class="fabric-metric-label">Thread Required</span><span class="fabric-metric-value" id="fe-thread">0m</span></div>' +
    '<div class="fabric-metric"><span class="fabric-metric-label">Energy</span><span class="fabric-metric-value" id="fe-energy">0 kWh</span></div>' +
    '<div class="fabric-metric"><span class="fabric-metric-label">Efficiency</span><span class="fabric-metric-value" id="fe-eff">0%</span></div>' +
    '</div></div>';
  this.init();
};

FabricSizeEstimator.prototype.init = function() {
  const _this = this;
  EventBus.on('estimation:updated', function(data) { _this.update(data); });
  this.update(state.state.estimation);
};

FabricSizeEstimator.prototype.update = function(data) {
  const els = {
    'fe-time': (data.weavingTimeHours || 0).toFixed(1) + 'h',
    'fe-thread': Math.round(data.threadConsumptionM || 0) + 'm',
    'fe-energy': (data.energyConsumptionKWh || 0).toFixed(1) + ' kWh',
    'fe-eff': Math.round(data.productionEfficiency || 0) + '%'
  };

  Object.keys(els).forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.textContent = els[id];
  });
};

window.FabricSizeEstimator = FabricSizeEstimator;