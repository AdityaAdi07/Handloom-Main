const DEFAULT_STATE = {
  machine: {
    loomSpeed:     120,
    targetSpeed:   150,
    cycleRate:     60,
    operatingMode: 'auto',
    motorState:    'on',
    productionMode:'normal',
  },
  thread: {
    warpTension:  65,
    weftTension:  65,
    yarnType:     'cotton',
    elasticity:   0.4,
    density:      80,
    thickness:    0.3,
  },
  environment: {
    temperature: 28,
    humidity:   55,
    vibration:  0.2,
    airflow:    1.0,
  },
  energy: {
    voltage:        230,
    current:        4.2,
    powerConsumption: 966,
  },
  production: {
    defectThreshold:  5,
    efficiencyTarget: 90,
    qualityTolerance: 'high',
  },
  pattern: {
    complexity:    0.5,
    insertionRate: 60,
    weaveDensity:  80,
    matrix:        null,
    imageURL:      null,
    matrixWidth:   0,
    matrixHeight:  0,
  },
  fabric: {
    sareeLength:    5.5,
    sareeWidth:     1.2,
    customDensity:  80,
    customComplexity: 0.5,
  },
  simulation: {
    mode:         'sandbox',
    running:      true,
    elapsedTime:  0,
    faultInjected: false,
    faultType:    null,
    activePreset:  null,
  },
  predictions: {
    defectRate:      0,
    faultProbability: 0,
    maintenanceScore: 0,
    qualityGrade:    'A',
    efficiencyScore: 0,
    anomalyScore:    0,
    status:         'safe',
    recommendations: [],
  },
  estimation: {
    weavingTimeHours:    0,
    threadConsumptionM:  0,
    energyConsumptionKWh: 0,
    defectProbability:   0,
    productionEfficiency: 0,
  },
};

class SandboxState {
  constructor() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  get(path) {
    const keys = path.split('.');
    let val = this.state;
    for (const k of keys) val = val && val[k];
    return val;
  }

  set(path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    let obj = this.state;
    for (const k of keys) obj = obj[k];
    const old = obj[last];
    obj[last] = value;
    if (window.EventBus) EventBus.emit(`param:${path}`, { old, new: value });
    if (window.EventBus) EventBus.emit('param:changed', { path, old, new: value });
  }

  patch(updates) {
    for (const [path, value] of Object.entries(updates)) {
      const keys = path.split('.');
      const last = keys.pop();
      let obj = this.state;
      for (const k of keys) obj = obj[k];
      const old = obj[last];
      obj[last] = value;
      if (window.EventBus) EventBus.emit(`param:${path}`, { old, new: value });
    }
    if (window.EventBus) EventBus.emit('state:patched');
  }

  reset() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    if (window.EventBus) EventBus.emit('state:reset');
  }

  getAll() {
    return JSON.parse(JSON.stringify(this.state));
  }
}

window.state = new SandboxState();
window.DEFAULT_STATE = DEFAULT_STATE;