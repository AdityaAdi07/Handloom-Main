const CONFIG = {
  FLASK_BASE_URL: 'http://localhost:5000',
  ORION_BASE_URL: 'http://localhost:1026',
  FIWARE_SERVICE: 'handloom',
  LOOM_ENTITY_ID: 'urn:ngsi-ld:Loom:sandbox-001',
  PREDICTION_RATE_MS: 500,
  TELEMETRY_RATE_MS: 200,
  LOG_RATE_MS: 1000,
  THREAD_COUNT_MAX: 200,
  FABRIC_SCROLL_SPEED: 0.001,
  ENABLE_BLOOM: true,
  ENABLE_SHADOWS: true,
  SANDBOX_ISOLATED: true,
};

async function post(url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    console.warn('API call failed:', e);
    return null;
  }
}

async function get(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.warn('API call failed:', e);
    return null;
  }
}

async function predict(stateData) {
  return post(CONFIG.FLASK_BASE_URL + '/api/sandbox/predict', stateData);
}

async function optimize(stateData, mode) {
  return post(CONFIG.FLASK_BASE_URL + '/api/sandbox/optimize', Object.assign({}, stateData, { mode: mode }));
}

async function saveSession(stateData) {
  return post(CONFIG.FLASK_BASE_URL + '/api/sandbox/session/save', stateData);
}

async function loadSession(sessionId) {
  return get(CONFIG.FLASK_BASE_URL + '/api/sandbox/session/' + sessionId);
}

async function getTelemetry(metric) {
  return get(CONFIG.FLASK_BASE_URL + '/api/sandbox/telemetry/' + metric);
}

async function pushToOrion(stateData) {
  if (state.get('simulation.mode') !== 'live') return;
  const attrs = mapStateToNGSI(stateData);
  try {
    await fetch(CONFIG.ORION_BASE_URL + '/v2/entities/' + CONFIG.LOOM_ENTITY_ID + '/attrs', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Fiware-Service': CONFIG.FIWARE_SERVICE,
      },
      body: JSON.stringify(attrs),
    });
  } catch (e) {
    console.warn('Orion push failed:', e);
  }
}

function mapStateToNGSI(stateData) {
  return {
    loomSpeed: { value: stateData.machine.loomSpeed, type: 'Number' },
    warpTension: { value: stateData.thread.warpTension, type: 'Number' },
    temperature: { value: stateData.environment.temperature, type: 'Number' },
    status: { value: stateData.predictions.status, type: 'String' },
  };
}

window.CONFIG = CONFIG;
window.predict = predict;
window.optimize = optimize;
window.saveSession = saveSession;
window.loadSession = loadSession;
window.getTelemetry = getTelemetry;
window.pushToOrion = pushToOrion;