# CLAUDE.md — Handloom Digital Twin: Sandbox Control Panel Module

> **For Claude Code** — This document provides the complete architectural specification,
> implementation blueprint, and development directives for the **Sandbox Control Panel**
> module of the Handloom Digital Twin system.

---

## 1. PROJECT CONTEXT

### System Overview

The **Handloom Digital Twin** is a real-time IoT-connected simulation platform for
industrial handloom weaving machines. It mirrors physical loom behavior in a live 3D
virtual environment and exposes predictive analytics, fault detection, and optimization
recommendations.

### Existing Architecture (Do Not Break)

| Layer | Technology |
|---|---|
| Context Broker | FIWARE Orion Context Broker (NGSIv2) |
| Telemetry Store | MongoDB Atlas |
| Backend | Python 3.11 + Flask (REST middleware) |
| 3D Visualization | Three.js / WebGL |
| Physics | Custom thread simulation (Catmull-Rom splines) |
| Pattern Logic | Matrix-based warp/weft weave engine |
| ML Predictions | Scikit-learn / custom Python inference layer |
| Frontend State | Vanilla JS + modular ES6 |

### What You Are Building

The **Sandbox Control Panel** — a fully isolated simulation environment layered on top
of the existing Digital Twin. It operates as a **"shadow simulation"** that does NOT
affect the live production system unless the user explicitly pushes changes.

Think of it as:
- An industrial machine control room
- A physics simulation laboratory
- An engineering command terminal

---

## 2. FILE STRUCTURE

Create the following file structure inside the project. Do not modify any existing files
unless explicitly instructed.

```
/sandbox/
├── index.html                        # Sandbox entry point
├── sandbox.css                       # All Sandbox-specific styles
├── sandbox.js                        # Main orchestrator (init, routing, state)
│
├── core/
│   ├── SandboxState.js               # Central reactive state store
│   ├── EventBus.js                   # Pub/sub internal event system
│   ├── SimulationLoop.js             # RAF-based update loop
│   └── ParameterEngine.js           # Validates + propagates parameter changes
│
├── twin/
│   ├── LoomScene.js                  # Three.js scene setup (renderer, camera, lights)
│   ├── LoomModel.js                  # Loom frame geometry and mesh builder
│   ├── ShuttleController.js          # Shuttle animation + speed sync
│   ├── ThreadSimulator.js            # Catmull-Rom warp/weft thread physics
│   ├── FabricMesh.js                 # Procedural fabric surface generation
│   ├── EffectsController.js         # Visual effects: glow, shake, color shifts
│   └── CameraController.js          # Orbit + macro/micro mode switching
│
├── panels/
│   ├── ControlPanel.js               # All sliders, toggles, dropdowns
│   ├── PatternImporter.js            # Image upload + matrix conversion
│   ├── FabricSizeEstimator.js        # Saree dimension + time estimation
│   ├── PredictionPanel.js            # AI/ML output display
│   ├── OptimizationEngine.js         # Recommendation system
│   ├── TelemetryDashboard.js         # Live charts and gauges
│   ├── PresetManager.js              # Simulation mode presets
│   └── Terminal.js                   # Command console
│
├── api/
│   ├── OrionClient.js                # FIWARE Orion NGSIv2 interface
│   ├── FlaskRelay.js                 # Flask backend API calls
│   ├── PredictionClient.js           # ML inference endpoint caller
│   └── SandboxIsolation.js          # Sandboxed vs live mode toggle
│
├── utils/
│   ├── PatternMatrix.js              # Image → binary matrix conversion
│   ├── ColorMapper.js                # Tension/heat → color mapping
│   ├── SplineUtils.js                # Catmull-Rom helpers
│   ├── Statistics.js                 # Running avg, variance, trend
│   └── Formatters.js                 # Unit formatting helpers
│
└── assets/
    ├── presets/                       # JSON preset configurations
    │   ├── cotton_saree.json
    │   ├── silk_mode.json
    │   ├── high_speed.json
    │   ├── fault_simulation.json
    │   ├── low_tension.json
    │   ├── high_humidity.json
    │   └── power_instability.json
    ├── shaders/                       # GLSL shaders
    │   ├── thread.vert
    │   ├── thread.frag
    │   ├── fabric.vert
    │   └── fabric.frag
    └── fonts/
        └── terminal.woff2
```

---

## 3. CORE STATE MODEL

### SandboxState.js

This is the **single source of truth** for all simulation parameters. All modules read
from and write to this store. Use a reactive pattern — changes trigger `EventBus` events.

```javascript
// SandboxState.js — full parameter schema

const DEFAULT_STATE = {

  // ── Machine Parameters ────────────────────────────────────────────────────
  machine: {
    loomSpeed:       120,      // RPM, range: 0–300
    targetSpeed:     150,      // RPM, range: 0–300
    cycleRate:       60,       // cycles/min, range: 1–200
    operatingMode:   'auto',   // 'auto' | 'manual' | 'maintenance'
    motorState:      'on',     // 'on' | 'off' | 'idle'
    productionMode:  'normal', // 'normal' | 'high' | 'eco'
  },

  // ── Thread Parameters ─────────────────────────────────────────────────────
  thread: {
    warpTension:     65,       // %, range: 0–100
    weftTension:     65,       // %, range: 0–100
    yarnType:        'cotton', // 'cotton' | 'silk' | 'polyester' | 'wool' | 'mixed'
    elasticity:      0.4,      // 0.0–1.0
    density:         80,       // threads/cm, range: 20–200
    thickness:       0.3,      // mm, range: 0.1–2.0
  },

  // ── Environmental Parameters ──────────────────────────────────────────────
  environment: {
    temperature:     28,       // °C, range: 10–60
    humidity:        55,       // %, range: 10–100
    vibration:       0.2,      // g, range: 0.0–5.0
    airflow:         1.0,      // m/s, range: 0.0–10.0
  },

  // ── Energy Parameters ─────────────────────────────────────────────────────
  energy: {
    voltage:         230,      // V, range: 180–260
    current:         4.2,      // A, range: 0–20
    powerConsumption: 966,     // W (auto-computed: voltage × current)
  },

  // ── Production Parameters ─────────────────────────────────────────────────
  production: {
    defectThreshold: 5,        // %, range: 0–30
    efficiencyTarget: 90,      // %, range: 50–100
    qualityTolerance: 'high',  // 'low' | 'medium' | 'high' | 'ultra'
  },

  // ── Pattern Parameters ────────────────────────────────────────────────────
  pattern: {
    complexity:      0.5,      // 0.0–1.0
    insertionRate:   60,       // picks/min, range: 10–200
    weaveDensity:    80,       // picks/cm, range: 10–200
    matrix:          null,     // Float32Array | null (from image import)
    imageURL:        null,     // preview URL
    matrixWidth:     0,
    matrixHeight:    0,
  },

  // ── Fabric Size Simulation ────────────────────────────────────────────────
  fabric: {
    sareeLength:     5.5,      // meters
    sareeWidth:      1.2,      // meters
    customDensity:   80,       // picks/cm
    customComplexity: 0.5,     // 0.0–1.0
  },

  // ── Simulation Metadata ───────────────────────────────────────────────────
  simulation: {
    mode:            'sandbox', // 'sandbox' | 'live'
    running:         true,
    elapsedTime:     0,         // seconds since start
    faultInjected:   false,
    faultType:       null,      // 'thread_break' | 'motor_fault' | 'power_spike' | null
    activePreset:    null,
  },

  // ── Derived / Computed (read-only, updated by engines) ───────────────────
  predictions: {
    defectRate:      0,
    faultProbability: 0,
    maintenanceScore: 0,
    qualityGrade:    'A',
    efficiencyScore: 0,
    anomalyScore:    0,
    status:          'safe',   // 'safe' | 'warning' | 'critical'
    recommendations: [],
  },

  estimation: {
    weavingTimeHours: 0,
    threadConsumptionM: 0,
    energyConsumptionKWh: 0,
    defectProbability: 0,
    productionEfficiency: 0,
  },
};
```

### EventBus.js

```javascript
// Lightweight pub/sub. Example usage:
// EventBus.on('param:machine.loomSpeed', handler)
// EventBus.emit('param:machine.loomSpeed', { old: 120, new: 150 })
// EventBus.on('state:reset', handler)
// EventBus.on('fault:injected', handler)
// EventBus.on('pattern:loaded', handler)
// EventBus.on('prediction:updated', handler)
// EventBus.on('optimization:result', handler)
```

---

## 4. 3D DIGITAL TWIN — IMPLEMENTATION SPEC

### LoomScene.js

Set up the Three.js scene. Requirements:

- **Renderer**: WebGLRenderer, antialias: true, shadowMap enabled (PCFSoftShadowMap)
- **Camera**: PerspectiveCamera, FOV 45, near 0.1, far 1000
- **OrbitControls**: enabled, with damping (dampingFactor: 0.05)
- **Lighting**:
  - AmbientLight (0x1a1a2e, intensity 0.4)
  - DirectionalLight as "sun" (0xffffff, intensity 1.0) casting shadows
  - PointLight array — 4 colored accent lights at loom corners
  - One "heat glow" PointLight (0xff4400) that scales with temperature
- **Post-processing** (optional but preferred): UnrealBloomPass for glowing effects
- **Background**: dark gradient or HDRI environment map (industrial theme)

### LoomModel.js

Build the loom frame from Three.js primitives. No external GLTF required — procedurally
generate from BoxGeometry, CylinderGeometry, and custom BufferGeometry.

Components to model:
```
LoomFrame         → main rectangular frame (steel-grey material)
WarpBeam          → cylinder at rear, rotates slowly
ClothBeam         → cylinder at front, accumulates fabric
Heddles           → array of thin rectangles, animate up/down
Beater            → swinging bar that advances with cycle
Shuttle           → small box that traverses warp threads
ReedComb          → array of thin vertical slats
TreadleMechanism  → lower linkage geometry
```

Material guidelines:
- Frame: MeshStandardMaterial, metalness: 0.8, roughness: 0.3, color: 0x2a2d35
- Beams: MeshStandardMaterial, color: 0x8B4513 (wood texture if possible)
- Shuttle: MeshStandardMaterial, color: 0xc8860a, emissive driven by speed

### ShuttleController.js

Animates the shuttle traversal across the warp threads.

```
shuttleSpeed = lerp(currentSpeed, target, 0.05) per frame
shuttleX oscillates between -warpWidth/2 and +warpWidth/2
shuttleX(t) = warpWidth/2 * sin(shuttlePhase)
shuttlePhase += (loomSpeed / 60) * (2π / framesPerSecond)

Visual effects:
- motion blur via object trail (ghost meshes with reduced opacity)
- color emissive intensity ∝ speed
- pause briefly at each end to simulate pick insertion
```

### ThreadSimulator.js

This is the core physics module. Use Catmull-Rom splines.

**Warp Thread Generation:**
```
numWarpThreads = thread.density (clamped 20–200)
For each warp thread i:
  controlPoints = [
    (x_i, 0, -loomDepth/2),      // rear beam anchor
    (x_i, sag_mid, 0),            // midpoint with tension sag
    (x_i, 0, loomDepth/2),       // front beam anchor
  ]
  sag = (1.0 - thread.warpTension/100) * MAX_SAG
  curve = CatmullRomCurve3(controlPoints)
  geometry = TubeGeometry(curve, 20, thread.thickness, 4)
```

**Weft Thread Generation:**
```
weftThreads generated per-pick (driven by cycleRate)
Each weft: horizontal curve at current weave position
Interlace with warp: alternate over/under based on pattern.matrix
```

**Thread Break Fault:**
```
When fault.type === 'thread_break':
  Select random warp thread index
  Snap animation: curve deflects away from path
  Thread renders with broken geometry (gap + frayed ends)
  Red warning indicator at break location
```

**Tension Color Mapping:**
```
low tension  (0–30%)   → color: 0x4fc3f7 (slack, blue)
normal       (30–70%)  → color: 0xe8d5b7 (natural, cream)
high tension (70–90%)  → color: 0xffa726 (stressed, orange)
over tension (90–100%) → color: 0xf44336 (critical, red)
```

### FabricMesh.js

Procedurally generates the woven fabric surface at the cloth beam.

```
PlaneGeometry(sareeWidth, fabricAccumulated, threadDensity*2, rows)
UV mapping driven by pattern.matrix
ShaderMaterial reads pattern matrix as texture
Fabric grows downward as picks accumulate
```

### EffectsController.js

Maps simulation parameters to visual effects:

| Parameter | Visual Effect |
|---|---|
| vibration > 1.0g | Frame shake (sin oscillation on scene.position) |
| vibration > 3.0g | Camera shake added |
| temperature > 45°C | Heat glow PointLight intensifies (orange) |
| temperature > 55°C | Emissive shimmer on frame (overheating) |
| power surge (voltage spike) | Flicker effect on all lights |
| thread break fault | Red flash + particle burst at break point |
| efficiency < 60% | Desaturate scene slightly |
| high speed (>250 RPM) | Motion blur on shuttle |
| humidity > 80% | Fog increases (scene.fog density) |

### CameraController.js

Two modes:

**Macro Mode** (default):
- Camera position: (0, 3, 8) looking at (0, 1, 0)
- Shows full loom in frame
- OrbitControls enabled

**Micro Mode** (thread-level view):
- Camera position: (0, 0.5, 1) looking at weave point
- Shows individual thread interlacing
- High detail, different LOD for threads

Toggle with keyboard shortcut `M` or UI button.

---

## 5. CONTROL PANEL — IMPLEMENTATION SPEC

### ControlPanel.js

Render all parameter controls. Group into collapsible sections.

**Slider Component Spec:**
```javascript
// Each slider must:
// 1. Show current value (live update)
// 2. Show min/max range
// 3. Show unit label
// 4. Color-code based on safe/warning/critical range
// 5. Emit EventBus event on change
// 6. Debounce rapid changes (16ms)

createSlider({
  id: 'loom-speed',
  label: 'Loom Speed',
  unit: 'RPM',
  min: 0, max: 300, step: 1,
  default: 120,
  warningAbove: 220,
  criticalAbove: 270,
  path: 'machine.loomSpeed',
})
```

**All controls to implement:**

```
MACHINE SECTION
  loomSpeed       slider  0–300 RPM
  targetSpeed     slider  0–300 RPM
  cycleRate       slider  1–200 cycles/min
  operatingMode   dropdown ['auto','manual','maintenance']
  motorState      toggle  on/off/idle
  productionMode  dropdown ['normal','high','eco']

THREAD SECTION
  warpTension     slider  0–100 %
  weftTension     slider  0–100 %
  yarnType        dropdown ['cotton','silk','polyester','wool','mixed']
  elasticity      slider  0.0–1.0
  density         slider  20–200 threads/cm
  thickness       slider  0.1–2.0 mm

ENVIRONMENT SECTION
  temperature     slider  10–60 °C
  humidity        slider  10–100 %
  vibration       slider  0.0–5.0 g
  airflow         slider  0.0–10.0 m/s

ENERGY SECTION
  voltage         slider  180–260 V
  current         slider  0–20 A
  powerDisplay    readout (auto = voltage × current)

PRODUCTION SECTION
  defectThreshold slider  0–30 %
  efficiencyTarget slider  50–100 %
  qualityTolerance dropdown ['low','medium','high','ultra']

PATTERN SECTION
  complexity      slider  0.0–1.0
  insertionRate   slider  10–200 picks/min
  weaveDensity    slider  10–200 picks/cm
```

---

## 6. PATTERN IMPORT SYSTEM — IMPLEMENTATION SPEC

### PatternImporter.js

```javascript
// STEP 1: File upload
// Accept: .png, .jpg, .jpeg, .bmp, .gif (monochrome preferred)
// Drag-and-drop + click-to-browse

// STEP 2: Canvas decode
// Draw image to offscreen Canvas2D
// Extract pixel data via getImageData()

// STEP 3: Convert to binary matrix
function imageToPatternMatrix(imageData, targetWidth = 64, targetHeight = 64) {
  // Resize to target grid resolution
  // Convert each pixel: luminance < 128 → 1 (warp up), else → 0 (warp down)
  // Returns Float32Array of size targetWidth × targetHeight
}

// STEP 4: Map to warp/weft
// matrix[row][col] === 1 → warp thread col is UP at pick row
// matrix[row][col] === 0 → warp thread col is DOWN at pick row

// STEP 5: Upload matrix to GPU as DataTexture
// Used by FabricMesh ShaderMaterial

// STEP 6: Compute derived metrics from matrix
function analyzePattern(matrix) {
  return {
    complexity:    entropyOfMatrix(matrix),   // 0.0–1.0
    floatLength:   averageFloatLength(matrix), // average thread float
    repeatSize:    detectRepeatUnit(matrix),   // dimensions of repeat
    coverFactor:   computeCoverFactor(matrix), // warp cover %
  };
}

// STEP 7: Push derived metrics to SandboxState.pattern
// This automatically updates all downstream engines
```

---

## 7. FABRIC SIZE ESTIMATOR — IMPLEMENTATION SPEC

### FabricSizeEstimator.js

The estimation engine uses empirical formulas. Update in real-time as any parameter changes.

```javascript
function estimateSaree(state) {
  const { sareeLength, sareeWidth, customDensity, customComplexity } = state.fabric;
  const { loomSpeed, cycleRate } = state.machine;
  const { warpTension, weftTension, yarnType } = state.thread;
  const { vibration, temperature, humidity } = state.environment;

  // Total picks needed
  const totalPicks = sareeLength * 100 * customDensity; // length_cm × picks/cm

  // Base weaving time (minutes)
  const effectiveCycleRate = cycleRate * efficiencyFactor(state);
  const baseTimeMin = totalPicks / effectiveCycleRate;

  // Complexity multiplier (more complex = more re-threading time)
  const complexityMult = 1.0 + (customComplexity * 1.5);

  // Environmental degradation
  const envFactor = 1.0
    + (Math.max(0, vibration - 0.5) * 0.1)
    + (Math.max(0, temperature - 35) * 0.005)
    + (Math.max(0, humidity - 70) * 0.003);

  const totalTimeHours = (baseTimeMin * complexityMult * envFactor) / 60;

  // Thread consumption
  const warpLength = sareeLength + 0.5; // loom waste
  const numWarpThreads = sareeWidth * 100 * customDensity;
  const weftLengthPerPick = sareeWidth + 0.02; // selvedge waste
  const warpConsumption = numWarpThreads * warpLength;
  const weftConsumption = totalPicks * weftLengthPerPick;
  const totalThreadM = warpConsumption + weftConsumption;

  // Energy consumption (kWh)
  const powerW = state.energy.voltage * state.energy.current;
  const energyKWh = (powerW / 1000) * totalTimeHours;

  // Defect probability (0–1)
  const defectProb = computeDefectProbability(state);

  // Production efficiency (%)
  const efficiency = computeEfficiency(state);

  return {
    weavingTimeHours: totalTimeHours,
    threadConsumptionM: totalThreadM,
    energyConsumptionKWh: energyKWh,
    defectProbability: defectProb,
    productionEfficiency: efficiency,
  };
}
```

---

## 8. AI PREDICTION ENGINE — IMPLEMENTATION SPEC

### PredictionPanel.js + PredictionClient.js

**Backend endpoint** (Flask):
```
POST /api/sandbox/predict
Content-Type: application/json

Body: { ...SandboxState (machine, thread, environment, energy, production, pattern) }

Response:
{
  "defect_rate": 3.2,
  "fault_probability": 0.12,
  "maintenance_score": 0.34,
  "quality_grade": "B+",
  "efficiency_score": 87.4,
  "anomaly_score": 0.08,
  "status": "warning",
  "alerts": ["warp tension high", "vibration above nominal"],
  "recommendations": [
    { "param": "machine.loomSpeed", "current": 250, "recommended": 180, "reason": "reduces defects by ~40%" },
    { "param": "thread.warpTension", "current": 88, "recommended": 65, "reason": "prevents thread stress" }
  ]
}
```

**Frontend fallback (when API unavailable):**

Implement a local JS prediction model using heuristics + polynomial regression coefficients.

```javascript
function localPredict(state) {
  // Defect rate heuristic
  let defectRate = 0;
  defectRate += speedDefectFactor(state.machine.loomSpeed);     // speed contribution
  defectRate += tensionDefectFactor(state.thread.warpTension);  // tension contribution
  defectRate += vibrationDefectFactor(state.environment.vibration);
  defectRate += complexityDefectFactor(state.pattern.complexity);
  defectRate = clamp(defectRate, 0, 100);

  // Quality grade derivation
  const grade = defectRateToGrade(defectRate);

  // Anomaly score
  const anomalyScore = computeAnomalyScore(state);

  // Status thresholds
  const status = defectRate < 5 ? 'safe' : defectRate < 15 ? 'warning' : 'critical';

  return { defectRate, grade, anomalyScore, status };
}
```

**UI Display:**
- Radial gauge for defect rate (green → yellow → red)
- Sparkline trend for last 60 seconds
- Quality grade badge (A+, A, B+, B, C, F)
- Blinking red border when status === 'critical'
- Animated recommendation cards that slide in when threshold exceeded

---

## 9. OPTIMIZATION ENGINE — IMPLEMENTATION SPEC

### OptimizationEngine.js

Modes: `quality-first` | `speed-first` | `balanced` | `low-energy`

```javascript
function optimize(state, mode) {
  const current = cloneState(state);
  let recommendations = [];

  switch (mode) {
    case 'quality-first':
      // Minimize defect rate regardless of speed
      recommendations = optimizeForQuality(current);
      break;
    case 'speed-first':
      // Maximize speed while keeping defects under threshold
      recommendations = optimizeForSpeed(current, state.production.defectThreshold);
      break;
    case 'balanced':
      // Pareto-optimal: maximize efficiency × quality
      recommendations = paretoOptimize(current);
      break;
    case 'low-energy':
      // Minimize power consumption, maintain minimum quality
      recommendations = optimizeForEnergy(current);
      break;
  }

  return {
    recommendations,     // array of { param, current, recommended, impact }
    projectedDefects: estimateDefectsAfterOptimization(current, recommendations),
    projectedEfficiency: estimateEfficiencyAfterOptimization(current, recommendations),
    projectedEnergy: estimateEnergyAfterOptimization(current, recommendations),
  };
}

// Each optimization function returns param recommendations.
// The UI presents these as "Apply" buttons — clicking patches SandboxState.
```

**Key optimization heuristics:**

| Optimization | Action |
|---|---|
| Reduce defects | Reduce speed by 20%, reduce vibration, normalize tensions |
| Maximize speed | Increase speed until defects approach threshold |
| Low energy | Reduce voltage to 210V, reduce speed 15%, reduce airflow |
| Balanced | Iterative gradient descent over defect/efficiency trade-off |

---

## 10. TERMINAL — IMPLEMENTATION SPEC

### Terminal.js

An interactive command-line console styled as an industrial engineering terminal.

**Command Registry:**

```javascript
const COMMANDS = {
  'increase speed':       () => patchState('machine.loomSpeed', s => Math.min(300, s + 20)),
  'decrease speed':       () => patchState('machine.loomSpeed', s => Math.max(0, s - 20)),
  'reduce vibration':     () => patchState('environment.vibration', s => Math.max(0, s - 0.5)),
  'optimize quality':     () => triggerOptimization('quality-first'),
  'optimize speed':       () => triggerOptimization('speed-first'),
  'optimize balanced':    () => triggerOptimization('balanced'),
  'optimize energy':      () => triggerOptimization('low-energy'),
  'simulate fault':       () => injectRandomFault(),
  'simulate thread break':() => injectFault('thread_break'),
  'simulate power spike': () => injectFault('power_spike'),
  'simulate motor fault': () => injectFault('motor_fault'),
  'generate defect':      () => forceFaultState(),
  'reset loom':           () => resetToDefaults(),
  'run prediction':       () => triggerPrediction(),
  'load pattern':         () => openPatternDialog(),
  'apply silk preset':    () => applyPreset('silk_mode'),
  'apply cotton preset':  () => applyPreset('cotton_saree'),
  'apply fault preset':   () => applyPreset('fault_simulation'),
  'estimate saree time':  () => printEstimation(),
  'status':               () => printSystemStatus(),
  'help':                 () => printCommandList(),
  'clear':                () => clearTerminal(),
  'set <param> <value>':  (args) => setParameter(args),
  'get <param>':          (args) => getParameter(args),
  'macro view':           () => setCameraMode('macro'),
  'micro view':           () => setCameraMode('micro'),
};
```

**Terminal Behavior:**
- Fixed-width monospace font (Courier New or Fira Mono)
- Dark background (#0a0f0a), green text (#00ff41) — CRT terminal aesthetic
- Command history: Up/Down arrow navigation
- Tab autocomplete: match partial command, show options
- Continuous system log output (telemetry, alerts, state changes)
- Timestamp prefix on each log line: `[HH:MM:SS.mmm]`
- Blinking cursor
- Scrollback buffer (max 500 lines)
- Copy support (Ctrl+C to copy selection)

**Simulated Log Messages (emit periodically):**
```
[14:32:01.421] TELEMETRY  speed=142 RPM tension=67% defect=2.1%
[14:32:03.117] INFO       Weft pick #4821 inserted
[14:32:05.889] WARN       Vibration elevated: 1.8g (nominal: <1.0g)
[14:32:08.234] PRED       Defect probability updated: 3.4% → SAFE
[14:32:11.001] SYSTEM     Pattern matrix loaded: 64×64 (entropy=0.72)
[14:32:14.567] ALERT      Temperature approaching threshold: 43°C
```

---

## 11. PRESET SYSTEM — IMPLEMENTATION SPEC

### PresetManager.js + assets/presets/*.json

Each preset is a partial state diff. Only specified fields are overwritten.

**cotton_saree.json:**
```json
{
  "name": "Cotton Saree Mode",
  "description": "Optimized for medium-density cotton weaving",
  "machine": { "loomSpeed": 140, "cycleRate": 70, "productionMode": "normal" },
  "thread": { "yarnType": "cotton", "warpTension": 65, "weftTension": 60, "thickness": 0.4, "density": 80 },
  "environment": { "temperature": 28, "humidity": 55 },
  "pattern": { "complexity": 0.4, "weaveDensity": 80 }
}
```

**silk_mode.json:**
```json
{
  "name": "Silk Mode",
  "description": "Delicate silk weaving with reduced speed and tension",
  "machine": { "loomSpeed": 80, "cycleRate": 40, "productionMode": "eco" },
  "thread": { "yarnType": "silk", "warpTension": 45, "weftTension": 40, "thickness": 0.1, "elasticity": 0.7 },
  "environment": { "humidity": 65 }
}
```

**fault_simulation.json:**
```json
{
  "name": "Fault Simulation",
  "description": "Simulates degraded machine conditions",
  "machine": { "loomSpeed": 260, "cycleRate": 130 },
  "thread": { "warpTension": 92, "weftTension": 88 },
  "environment": { "vibration": 3.5, "temperature": 52 },
  "energy": { "voltage": 248, "current": 16 },
  "simulation": { "faultInjected": true, "faultType": "thread_break" }
}
```

**high_speed.json, low_tension.json, high_humidity.json, power_instability.json** — follow the same pattern with appropriate parameter values.

---

## 12. TELEMETRY DASHBOARD — IMPLEMENTATION SPEC

### TelemetryDashboard.js

Use **Chart.js** or a lightweight custom canvas renderer for charts.

**Charts to render:**

| Chart | X-axis | Y-axis | Update rate |
|---|---|---|---|
| Speed trend | time (last 60s) | RPM | 1 Hz |
| Vibration trend | time | g-force | 2 Hz |
| Power usage | time | Watts | 1 Hz |
| Warp tension | time | % | 1 Hz |
| Defect rate trend | time | % | 0.5 Hz |
| Anomaly score | time | 0–1 | 0.5 Hz |

**Gauges (SVG arc gauges):**
- Current speed (RPM) — semicircular, green/yellow/red zones
- Defect rate (%) — radial fill
- Efficiency score (%) — radial fill
- Power consumption (W) — bar gauge

**All charts:**
- Dark background (#0d1117)
- Glowing line color (use CSS drop-shadow filter)
- Rolling window: 60 data points
- Smooth animation between updates

---

## 13. API INTEGRATION — IMPLEMENTATION SPEC

### OrionClient.js

```javascript
const ORION_BASE = 'http://localhost:1026/v2';
const FIWARE_SERVICE = 'handloom';
const ENTITY_ID = 'urn:ngsi-ld:Loom:sandbox-001';

// Push sandbox state to Orion (only when not in isolated mode)
async function pushSandboxState(state) {
  if (SandboxState.simulation.mode !== 'live') return;
  const attrs = mapStateToNGSI(state);
  await fetch(`${ORION_BASE}/entities/${ENTITY_ID}/attrs`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Fiware-Service': FIWARE_SERVICE,
    },
    body: JSON.stringify(attrs),
  });
}

// Subscribe to real-time Orion notifications (for live mode)
function subscribeToOrionUpdates(callback) {
  // POST /v2/subscriptions → Orion webhook → local /sandbox/notify
}
```

### FlaskRelay.js

```javascript
const FLASK_BASE = 'http://localhost:5000/api';

async function predict(state)      { return POST(`${FLASK_BASE}/sandbox/predict`, state); }
async function optimize(state, mode) { return POST(`${FLASK_BASE}/sandbox/optimize`, { ...state, mode }); }
async function saveSession(state)  { return POST(`${FLASK_BASE}/sandbox/session/save`, state); }
async function loadSession(id)     { return GET(`${FLASK_BASE}/sandbox/session/${id}`); }
async function getHistory(metric)  { return GET(`${FLASK_BASE}/sandbox/telemetry/${metric}`); }
```

### SandboxIsolation.js

```javascript
// Two modes:
// 'sandbox' — all changes are local only, never pushed to Orion/MongoDB
// 'live'    — changes pushed to Orion context broker in real time

// Toggle button in UI header: [SANDBOX MODE] / [LIVE MODE]
// When switching to live mode, show confirmation dialog with risk warning
```

---

## 14. UI / UX DESIGN DIRECTIVES

### Visual Theme

- **Dark industrial control room** aesthetic
- Primary background: `#080c10` (near-black with slight blue tint)
- Panel backgrounds: `#0d1520` with `1px solid #1e3050` border
- Accent color: `#00d4ff` (cyan — primary interactive elements)
- Warning color: `#ffaa00` (amber)
- Critical color: `#ff3040` (red)
- Safe color: `#00ff88` (green)
- Text: `#c8d8e8` primary, `#6080a0` secondary
- Font stack: `'JetBrains Mono'` for data/terminal, `'Rajdhani'` for UI labels

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Sandbox Control Panel    [SANDBOX MODE] [LIVE MODE]  [⚙]  │
├──────────────┬──────────────────────────────────┬───────────────────┤
│              │                                  │                   │
│  CONTROL     │   3D DIGITAL TWIN VIEWPORT       │   AI PREDICTION   │
│  PANEL       │   (Three.js + WebGL)             │   PANEL           │
│  (left       │   full center                    │   (right          │
│   320px)     │                                  │    280px)         │
│              │                                  │                   │
│  Collapsible │   [Macro] [Micro] [Record]        │   Gauges          │
│  sections:   │                                  │   Grade           │
│  - Machine   │                                  │   Alerts          │
│  - Thread    ├──────────────────────────────────┤   Recommendations │
│  - Environ.  │   TELEMETRY DASHBOARD             │                   │
│  - Energy    │   (charts row, 200px height)      │                   │
│  - Pattern   │                                  │                   │
│  - Fabric    ├──────────────────────────────────┤                   │
│  - Faults    │   TERMINAL CONSOLE               │   OPTIMIZATION    │
│              │   (bottom, 180px height)          │   ENGINE          │
├──────────────┴──────────────────────────────────┴───────────────────┤
│  PRESET BAR:  [Cotton] [Silk] [HighSpeed] [Fault] [LowTension] ...  │
└─────────────────────────────────────────────────────────────────────┘
```

### Responsive Behavior

- Minimum supported width: 1280px (this is a professional engineering tool)
- At 1280px: collapse control panel to icon sidebar, expand on hover
- At 1600px+: full three-column layout
- No mobile optimization required

### Animations

- Parameter changes: smooth interpolation in 3D (no instant jumps)
- Panel transitions: 150ms ease-out slide
- Gauges: smooth arc animation (requestAnimationFrame)
- Chart updates: smooth point addition (no full re-renders)
- Critical alerts: pulse animation (box-shadow breathing)
- Preset activation: brief "scanning" animation across controls

---

## 15. FLASK BACKEND ADDITIONS REQUIRED

Add these endpoints to the existing Flask app. Create new file: `sandbox_routes.py`

```python
# sandbox_routes.py
from flask import Blueprint, request, jsonify
sandbox_bp = Blueprint('sandbox', __name__, url_prefix='/api/sandbox')

@sandbox_bp.route('/predict', methods=['POST'])
def predict():
    """Run ML inference on sandbox parameters"""
    params = request.json
    result = run_prediction_model(params)
    return jsonify(result)

@sandbox_bp.route('/optimize', methods=['POST'])
def optimize():
    """Return optimization recommendations"""
    params = request.json
    mode = params.pop('mode', 'balanced')
    result = run_optimization(params, mode)
    return jsonify(result)

@sandbox_bp.route('/session/save', methods=['POST'])
def save_session():
    """Save sandbox state to MongoDB"""
    ...

@sandbox_bp.route('/session/<session_id>', methods=['GET'])
def load_session(session_id):
    """Load sandbox state from MongoDB"""
    ...

@sandbox_bp.route('/telemetry/<metric>', methods=['GET'])
def get_telemetry(metric):
    """Return historical telemetry from MongoDB Atlas"""
    ...
```

Register in `app.py`:
```python
from sandbox_routes import sandbox_bp
app.register_blueprint(sandbox_bp)
```

---

## 16. IMPLEMENTATION PRIORITIES

Implement in this order:

1. **SandboxState.js + EventBus.js** — foundation, all else depends on this
2. **LoomScene.js + LoomModel.js** — get 3D visible
3. **ThreadSimulator.js** — core physics
4. **ControlPanel.js** — parameter controls wired to state
5. **ShuttleController.js + EffectsController.js** — reactive 3D behavior
6. **PredictionPanel.js** (local fallback mode first)
7. **Terminal.js** — command console
8. **PresetManager.js** — quick mode switching
9. **TelemetryDashboard.js** — charts
10. **PatternImporter.js** — image upload
11. **FabricSizeEstimator.js** — production estimation
12. **OptimizationEngine.js** — recommendations
13. **FabricMesh.js + ShaderMaterial** — fabric visualization
14. **OrionClient.js + FlaskRelay.js** — backend integration
15. **CameraController.js** — macro/micro toggle

---

## 17. TESTING CHECKLIST

Before submitting any module, verify:

- [ ] Parameter change in ControlPanel → reflected in SandboxState within 16ms
- [ ] SandboxState change → 3D scene updates within 1 animation frame
- [ ] All sliders emit EventBus events
- [ ] Preset application patches all specified state fields
- [ ] Terminal commands execute correct actions
- [ ] Pattern import converts image to matrix and updates state
- [ ] Fabric estimator recalculates on every relevant state change
- [ ] Prediction panel updates within 500ms of parameter change
- [ ] Optimization recommendations can be applied via "Apply" button
- [ ] Fault injection triggers visual effects in 3D scene
- [ ] Sandbox isolation: no Orion calls in sandbox mode
- [ ] No console errors in Chrome DevTools
- [ ] No Three.js deprecated API usage
- [ ] Charts render without flicker
- [ ] Terminal scrollback works correctly

---

## 18. DO NOT

- Do NOT modify any existing files outside `/sandbox/`
- Do NOT break the existing Digital Twin live monitoring view
- Do NOT use `alert()`, `confirm()`, or `prompt()` — use custom modals
- Do NOT import React or Vue — this module uses vanilla ES6 modules
- Do NOT hardcode the Flask or Orion URLs — use a `config.js` constants file
- Do NOT use `var` — use `const` and `let` only
- Do NOT use synchronous XHR — all API calls must be `async/await`
- Do NOT block the main thread — heavy computation goes in Web Workers
- Do NOT re-render the entire Three.js scene on every parameter change —
  update only the affected objects

---

## 19. CONFIGURATION FILE

Create `/sandbox/config.js`:

```javascript
export const CONFIG = {
  FLASK_BASE_URL:    'http://localhost:5000',
  ORION_BASE_URL:    'http://localhost:1026',
  FIWARE_SERVICE:    'handloom',
  LOOM_ENTITY_ID:    'urn:ngsi-ld:Loom:sandbox-001',
  PREDICTION_RATE_MS: 500,    // how often to run prediction
  TELEMETRY_RATE_MS:  200,    // telemetry chart update rate
  LOG_RATE_MS:        1000,   // terminal log emit rate
  THREAD_COUNT_MAX:   200,    // max warp threads in 3D (perf limit)
  FABRIC_SCROLL_SPEED: 0.001, // meters per animation frame
  ENABLE_BLOOM:       true,
  ENABLE_SHADOWS:     true,
  SANDBOX_ISOLATED:   true,   // default: sandbox mode (no Orion writes)
};
```

---

## 20. QUICK REFERENCE: EVENT NAMES

All EventBus events used across the system:

```
param:<path>              fired on any state parameter change
  e.g. param:machine.loomSpeed, param:thread.warpTension

state:reset               full state reset to defaults
state:preset:<name>       preset applied
state:mode:<mode>         sandbox/live mode toggled

fault:injected            fault simulation started
fault:cleared             fault cleared

pattern:loaded            new pattern matrix loaded
pattern:analyzed          pattern analysis complete

prediction:updated        new prediction result available
prediction:critical       defect rate exceeded critical threshold

optimization:requested    user triggered optimization
optimization:result       optimization recommendations ready

estimation:updated        fabric size estimation recalculated

terminal:command          user entered terminal command
terminal:log              new log message to display

camera:mode:<mode>        macro/micro camera mode changed
```

---

*End of CLAUDE.md — Handloom Digital Twin Sandbox Control Panel Specification*
*Version: 1.0.0 | Status: Ready for Implementation*
