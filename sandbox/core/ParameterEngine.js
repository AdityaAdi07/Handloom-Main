class ParameterEngine {
  constructor() {
    this.debounceTimers = new Map();
    this.DEBOUNCE_MS = 16;
    EventBus.on('param:changed', (d) => this.onParamChange(d));
  }

  onParamChange(data) {
    const path = data.path;
    if (this.debounceTimers.has(path)) {
      clearTimeout(this.debounceTimers.get(path));
    }
    const _this = this;
    this.debounceTimers.set(path, setTimeout(function() {
      _this.debounceTimers.delete(path);
      _this.propagate(path, data.new);
    }, this.DEBOUNCE_MS));
  }

  propagate(path, value) {
    if (path === 'energy.voltage' || path === 'energy.current') {
      const v = state.get('energy.voltage') || 0;
      const i = state.get('energy.current') || 0;
      state.state.energy.powerConsumption = Math.round(v * i);
      EventBus.emit('param:energy.powerConsumption', { old: null, new: state.state.energy.powerConsumption });
    }

    if (path.startsWith('machine.') || path.startsWith('thread.') || path.startsWith('environment.') || path.startsWith('fabric.')) {
      this.updateEstimation();
    }

    EventBus.emit('param:propagated', { path, value });
  }

  updateEstimation() {
    const s = state.state;
    const { sareeLength, sareeWidth, customDensity, customComplexity } = s.fabric;
    const { cycleRate } = s.machine;
    const { warpTension, weftTension } = s.thread;
    const { vibration, temperature, humidity } = s.environment;

    const totalPicks = sareeLength * 100 * customDensity;
    const efficiencyFactor = this.calcEfficiencyFactor(s);
    const effectiveCycleRate = cycleRate * efficiencyFactor;
    const baseTimeMin = totalPicks / (effectiveCycleRate || 1);
    const complexityMult = 1.0 + (customComplexity * 1.5);
    const envFactor = 1.0
      + (Math.max(0, vibration - 0.5) * 0.1)
      + (Math.max(0, temperature - 35) * 0.005)
      + (Math.max(0, humidity - 70) * 0.003);

    const totalTimeHours = (baseTimeMin * complexityMult * envFactor) / 60;

    const warpLength = sareeLength + 0.5;
    const numWarpThreads = sareeWidth * 100 * customDensity;
    const weftLengthPerPick = sareeWidth + 0.02;
    const totalThreadM = (numWarpThreads * warpLength) + (totalPicks * weftLengthPerPick);

    const powerW = s.energy.voltage * s.energy.current;
    const energyKWh = (powerW / 1000) * totalTimeHours;

    const defectProb = this.computeDefectProbability(s);
    const efficiency = this.computeEfficiency(s);

    state.state.estimation = {
      weavingTimeHours:    Math.round(totalTimeHours * 100) / 100,
      threadConsumptionM: Math.round(totalThreadM),
      energyConsumptionKWh: Math.round(energyKWh * 100) / 100,
      defectProbability:  Math.round(defectProb * 100) / 100,
      productionEfficiency: Math.round(efficiency),
    };

    EventBus.emit('estimation:updated', state.state.estimation);
  }

  calcEfficiencyFactor(s) {
    const speedFactor = Math.max(0.3, 1 - (s.machine.loomSpeed / 300) * 0.4);
    const tensionFactor = Math.max(0.5, 1 - Math.abs(s.thread.warpTension - 65) / 130);
    return speedFactor * tensionFactor;
  }

  computeDefectProbability(s) {
    let defect = 0;
    defect += Math.max(0, (s.machine.loomSpeed - 200) / 5);
    defect += Math.max(0, (s.thread.warpTension - 80) / 4);
    defect += s.environment.vibration * 5;
    defect += s.pattern.complexity * 10;
    return Math.min(100, defect);
  }

  computeEfficiency(s) {
    const speedEff = Math.max(0, 100 - (s.machine.loomSpeed / 3));
    const tensionEff = 100 - Math.abs(s.thread.warpTension - 65);
    return Math.max(0, Math.min(100, (speedEff + tensionEff) / 2));
  }
}

window.paramEngine = new ParameterEngine();