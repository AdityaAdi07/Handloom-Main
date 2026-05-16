# Handloom Weaving Digital Twin

A high-fidelity, real-time, physics-based Digital Twin of a traditional handloom weaving process. This project leverages the **FIWARE Framework** for IoT telemetry ingestion, **Three.js** for 3D visualization, and machine learning models for predictive analytics.

---

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Algorithms & Physics](#algorithms--physics)
- [AI & Predictive Models](#ai--predictive-models)
- [Sandbox Control Panel](#sandbox-control-panel)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Setup & Execution](#setup--execution)
- [Interacting with the Twin](#interacting-with-the-twin)

---

## Overview
<img width="1600" height="872" alt="image" src="https://github.com/user-attachments/assets/9ee71524-419f-4f54-bc75-e66f3a23c594" />



The Handloom Weaving Digital Twin is an industrial IoT simulation platform that mirrors physical loom behavior in a live 3D virtual environment. It connects real-world sensor data through FIWARE's Orion Context Broker, visualizes the weaving process using Three.js WebGL, and provides predictive analytics through machine learning models.

### Why This Project?

Traditional handloom weaving is a complex mechanical process that requires precise control of thread tensions, shuttle speeds, and environmental conditions. This digital twin enables:

- **Real-time monitoring** of loom parameters from anywhere
- **Predictive maintenance** to prevent machine failures
- **Quality optimization** through AI-driven recommendations
- **Simulation sandbox** for testing parameter changes without affecting production

---

## Key Features

### 1. Real-Time 3D Simulation
- Procedurally generated 3D loom model using WebGL/Three.js
- Dynamic shuttle animation synchronized with machine speed
- Thread physics with tension-based sag using Catmull-Rom splines
- Visual effects for vibration, temperature, and faults

### 2. Micro-Level Thread Core View
<img width="1600" height="804" alt="image" src="https://github.com/user-attachments/assets/941df123-375b-40c1-995a-350e2bfbe1a2" />
- Zoom into the mechanical shedding, shuttle flight, and beat-up mechanics
- Visualizes warp/weft interlacing based on active weave patterns (Twill, Satin, Basket)
- Matrix-based pattern generation for fabric structures
- Interactive thread-level physics simulation

### 3. FIWARE IoT Integration
- Connects to Orion Context Broker for live telemetry ingestion
- Stores entity data in MongoDB for persistence
- Real-time entity updates via NGSI-v2 API
- Support for multiple loom entities

### 4. Dynamic Physics Engine

- Thread sag visualization based on tension values
- Catmull-Rom spline-based thread geometry
- Linear interpolation for smooth shed animations
- Fault injection for simulation scenarios

### 5. Premium UI & Themes
- High-end responsive HUD with glowing gauge bars
- Canvas-based live charting for telemetry
- Built-in synchronized Light/Dark Mode toggle
- Dark industrial control room aesthetic

<img width="1911" height="964" alt="Screenshot 2026-05-06 164157" src="https://github.com/user-attachments/assets/a7f3d0b8-5674-49d5-90ca-bad10aa42aa3" />
<img width="1914" height="968" alt="Screenshot 2026-05-06 164140" src="https://github.com/user-attachments/assets/19727690-e1d4-4ada-a69a-af0e8347a1e7" />

### 6. Loom Intelligence Dashboard
- FastAPI-powered ML inference engine
- Interactive prediction controls
- Live telemetry overlays
- Quality, defect, and fault probability predictions

### 7. Sandbox Control Panel
- Fully isolated simulation environment ("shadow simulation")
- Parameter controls for machine, thread, environment, energy
- Pattern import from images with automatic matrix conversion
- Fabric size and time estimation
- Optimization engine with multiple modes
- Terminal console for command-based control

### 8. Alert System
- Automated email notifications for critical conditions
- Configurable thresholds for fault detection
- Real-time status indicators (safe/warning/critical)

---

## Architecture

The digital twin architecture consists of four primary layers:

```
┌────────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                              │
│   index.html (Dashboard) | weave.html (Thread Core) | sandbox/    │
│   Three.js WebGL | Canvas Charts | Terminal | Control Panel       │
└────────────────────────────────────────────────────────────────────┘
                                  ↓
┌────────────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE LAYER (Flask)                        │
│   Relay API (port 5050) | Sandbox Routes | ML Inference Proxy     │
│   CORS handling | Data transformation | Alert notifications       │
└────────────────────────────────────────────────────────────────────┘
                                  ↓
┌────────────────────────────────────────────────────────────────────┐
│                    CONTEXT BROKER LAYER (FIWARE)                   │
│   Orion Context Broker (port 1026) | MongoDB Storage              │
│   NGSI-v2 API | Entity Management | Subscription System           │
└────────────────────────────────────────────────────────────────────┘
                                  ↓
┌────────────────────────────────────────────────────────────────────┐
│                    DATA SOURCE LAYER                               │
│   IoT Streamer | ESP32 Sensors | Dataset (CSV/JSON)                │
│   Real-time telemetry simulator | Pattern matrices                │
└────────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Data Flow Pipeline

1. **Data Source**: IoT sensors or simulated data sends machine metrics (speed, tension, temperature, vibration)
2. **Streamer**: Python script converts raw data to FIWARE NGSI-v2 format
3. **Orion**: Context Broker receives and stores entity updates in MongoDB
4. **Flask Relay**: Polls Orion, parses payload, serves cleaned JSON to frontend
5. **Frontend**: Three.js renders 3D visualization; ML models generate predictions

### Entity Model

```json
{
  "id": "Loom:01",
  "type": "Loom",
  "speed": { "value": 120, "type": "Number" },
  "tension": { "value": 65, "type": "Number" },
  "temperature": { "value": 28, "type": "Number" },
  "vibration": { "value": 0.2, "type": "Number" }
}
```

### Demo Mode Fallback

If the FIWARE backend is unavailable, the UI automatically generates procedural mock telemetry to demonstrate the visual physics engines.

---

## Algorithms & Physics

### Catmull-Rom Splines for Thread Geometry
- Generates continuous tubular 3D geometry for weft threads
- Sag calculation: `sag = (1.0 - tension/100) * MAX_SAG`
- Tension mapped to vertical displacement proportionally to `(5.0 - live_tension)`

### Linear Interpolation (Lerp) for Shed Animation
- Smooth transition animations for mechanical shed
- Warp threads alternate up/down positions
- Bound by `MAX_SHED_ANGLE`

### Matrix Mapping Algorithm
- Converts 2D boolean matrices to 3D mechanical positioning
- `1` → "UP" position, `0` → "DOWN" position
- Supports Twill, Basket, Satin, and custom patterns

### Thread Tension Color Mapping
| Tension Range | Color | Visual |
|--------------|-------|--------|
| 0–30% | 0x4fc3f7 (Blue) | Slack |
| 30–70% | 0xe8d5b7 (Cream) | Normal |
| 70–90% | 0xffa726 (Orange) | Stressed |
| 90–100% | 0xf44336 (Red) | Critical |

### Fault Injection
- Thread break: Select random warp thread, deflect curve, render broken geometry
- Motor fault: Reduce speed, increase vibration
- Power spike: Voltage fluctuation effects

---

## AI & Predictive Models

<img width="1918" height="971" alt="Screenshot 2026-05-06 164133" src="https://github.com/user-attachments/assets/f5187a43-480c-4ef7-9ac3-a7ddea701fd2" />

The system integrates multiple machine learning models for comprehensive predictive analytics.

### 1. Quality Prediction Model (Random Forest Classifier)
- **Input**: Machine (speed, cycles), Thread (tensions, yarn_type), Environment, Pattern matrices
- **Output**: Quality Class (0=Reject, 1=Standard, 2=Premium, 3=Flawless)
- **Use**: Predicts fabric quality for optimization

### 2. Defect Rate Model (Random Forest Regressor)
- **Input**: Same as Quality Model
- **Output**: Continuous defect rate value (e.g., 0.25 = 25%)
- **Use**: Predicts production defects

### 3. Fault Detection Model (Random Forest Classifier)
- **Input**: Vibration, tensions, vibration_delta, tension_delta
- **Output**: Fault Class (0=Normal, 1=Thread Break, 2=Motor Fault, 3=Overheat)
- **Use**: Early warning system

### 4. Predictive Maintenance Model (Random Forest Classifier)
- **Input**: Anomaly score, vibration, tension, machine signals
- **Output**: Maintenance requirement probability (0=Healthy, 1=Maintenance Req)
- **Use**: Schedule maintenance proactively

### 5. Anomaly Detection
- Input: All sensor parameters
- Output: Anomaly score (0-1)
- Uses statistical deviation from normal operating ranges

### 6. Optimization Engine
- **Modes**: quality-first, speed-first, balanced, low-energy
- Iterates through Quality and Defect models
- Outputs optimal parameter configurations

### 7. What-If Simulator
- Takes user inputs from UI
- Outputs interactive predictions in real-time
- Enables parameter impact analysis

### ML Architecture Flow

```
Raw Data → Feature Engineering
         ↓
[ Quality | Defect | Fault | RPM | Anomaly | Maintenance ] Models
         ↓
Optimization + What-If Simulator
         ↓
UI Dashboard (Digital Twin)
```

---

## Sandbox Control Panel
<img width="1919" height="972" alt="Screenshot 2026-05-14 233016" src="https://github.com/user-attachments/assets/6d37d78d-ec89-46f2-a7ff-6e70a5e6ae2a" />
<img width="1245" height="787" alt="Screenshot 2026-05-14 233107" src="https://github.com/user-attachments/assets/4aed34fe-e9dd-44fa-8550-7e5036d5430b" />


The Sandbox Control Panel is a fully isolated simulation environment that operates as a "shadow simulation" without affecting the live production system.

### Core Components

#### State Management
- Central reactive state store (`SandboxState.js`)
- Pub/sub event system (`EventBus.js`)
- Parameter validation and propagation (`ParameterEngine.js`)

#### 3D Digital Twin
- Three.js scene setup with lighting and post-processing
- Procedural loom frame geometry
- Shuttle animation with motion effects
- Thread simulator with Catmull-Rom physics
- Effects controller for visual feedback

#### Control Panels
| Panel | Description |
|-------|-------------|
| Machine Controls | Loom speed, target speed, cycle rate, operating mode |
| Thread Controls | Warp/weft tension, yarn type, elasticity, density |
| Environment Controls | Temperature, humidity, vibration, airflow |
| Energy Controls | Voltage, current, power consumption |
| Production Controls | Defect threshold, efficiency target, quality tolerance |
| Pattern Controls | Complexity, insertion rate, weave density |
| Fabric Controls | Saree dimensions, custom density |

#### Advanced Features
- **Pattern Importer**: Upload images, convert to binary matrix, analyze pattern complexity
- **Fabric Size Estimator**: Calculate weaving time, thread consumption, energy usage
- **Prediction Panel**: Display defect rate, fault probability, quality grade
- **Optimization Engine**: Multi-mode parameter optimization
- **Telemetry Dashboard**: Real-time charts and gauges
- **Terminal Console**: Command-based control interface
- **Preset Manager**: Pre-configured simulation modes

### Sandbox Isolation
- **Sandbox Mode**: All changes are local only, never pushed to Orion
- **Live Mode**: Changes pushed to Orion in real time
- Toggle with confirmation dialog

---

## Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend** | HTML5, Vanilla JavaScript (ES6+), CSS3 |
| **3D Graphics** | Three.js (r128), WebGL, GLSL Shaders |
| **IoT Backend** | FIWARE Orion Context Broker (NGSI-v2) |
| **Database** | MongoDB (via Orion) |
| **Middleware** | Python 3.11+, Flask, Flask-CORS |
| **ML Backend** | FastAPI, Uvicorn, Scikit-learn |
| **Machine Learning** | Random Forest (Classifier/Regressor) |
| **Containerization** | Docker, Docker Compose |
| **Visualization** | Chart.js for telemetry dashboards |
| **Communication** | REST API, WebSocket (optional), postMessage |

---

## Project Structure

```
Handloom-Twin/
├── Fiware/
│   ├── bckend/
│   │   ├── relay.py              # Flask relay server (port 5050)
│   │   ├── sandbox_routes.py     # Sandbox API endpoints
│   │   └── stream_fi.py          # FIWARE data streamer
│   └── frntend/
│       ├── index.html            # Dashboard (macroscopic view)
│       ├── weave.html            # Thread Core (microscopic view)
│       ├── ind2.html             # Alternative UI
│       ├── wev2.html            # Alternative weave view
│       ├── convert.py           # Data conversion utilities
│       ├── patch.py             # UI patching utilities
│       ├── texture_b64.js       # Texture encoding
│       └── CLAUDE.md            # Sandbox module specification
│
├── sandbox/
│   ├── index.html                # Sandbox entry point
│   ├── config.js                # Configuration constants
│   ├── sandbox.js               # Main orchestrator
│   ├── core/                    # State management
│   │   ├── SandboxState.js
│   │   ├── EventBus.js
│   │   ├── SimulationLoop.js
│   │   └── ParameterEngine.js
│   ├── twin/                    # 3D visualization
│   │   ├── LoomScene.js
│   │   ├── LoomModel.js
│   │   ├── ShuttleController.js
│   │   ├── ThreadSimulator.js
│   │   ├── EffectsController.js
│   │   └── ...
│   ├── panels/                  # UI panels
│   │   ├── ControlPanel.js
│   │   ├── PredictionPanel.js
│   │   ├── OptimizationEngine.js
│   │   ├── TelemetryDashboard.js
│   │   ├── PatternImporter.js
│   │   ├── FabricSizeEstimator.js
│   │   └── ...
│   ├── api/                     # API clients
│   │   ├── OrionClient.js
│   │   ├── FlaskRelay.js
│   │   └── SandboxIsolation.js
│   └── utils/                   # Utilities
│       ├── Formatters.js
│       └── MathUtils.js
│
├── loom_3d/
│   └── digital_twin/
│       ├── api/
│       │   └── main.py           # FastAPI ML inference server
│       ├── train_all.py         # Model training script
│       ├── run_preprocessing.py
│       ├── test_preds.py
│       └── api_test_cases.md
│
├── data/                        # Dataset files
│   └── final_fix.py
│
├── create_weave.py              # Weave pattern generator
├── extract_loom_01.py           # Data extraction utility
├── filter_speed.py             # Data filtering
├── loom_simulation.py          # Standalone simulation
├── pattern.json                 # Default pattern matrix
├── dataset.csv                  # Raw dataset
├── dataset.json                 # JSON dataset
│
├── Data_visualize.ipynb         # Jupyter notebook for visualization
├── loom_eda.ipynb              # Exploratory data analysis
├── loom_eda_executed.ipynb     # Executed EDA notebook
│
├── index.html                   # Root HTML (redirect)
├── README.md                    # This file
└── docker-compose.yml          # FIWARE stack configuration
```

---

## Setup & Execution

### Prerequisites
- Docker and Docker Compose
- Python 3.11+
- Web browser (Chrome/Firefox/Edge)
- 4GB+ RAM recommended

### Step 1: Start FIWARE Stack
```bash
docker-compose up -d
```
Verify at: `http://localhost:1026/version`

### Step 2: Start Flask Relay
```bash
cd Fiware/bckend
pip install flask flask-cors requests smtplib
python relay.py
```
Verify at: `http://localhost:5050/twin`

### Step 3: Start ML Inference Backend (FastAPI)
```bash
cd loom_3d/digital_twin
pip install fastapi uvicorn scikit-learn
uvicorn api.main:app --reload
```
Verify at: `http://localhost:8000/docs`

### Step 4: Launch Frontend
```bash
cd Fiware/frntend
python -m http.server 8000
```
Open: `http://localhost:8000/index.html`

For Sandbox:
```bash
cd sandbox
python -m http.server 8080
```
Open: `http://localhost:8080/index.html`

---

## Interacting with the Twin

### 3D View Controls
- **Rotate**: Click and drag
- **Pan**: Right-click and drag
- **Zoom**: Mouse wheel

### View Modes
- **Macro Mode**: Full loom view
- **Micro Mode**: Thread-level detail (press `M` or click button)

### Dashboard Features
- Theme toggle (Light/Dark mode) - top right
- Live telemetry gauges
- Historical charts
- Quality prediction display
- Alert notifications

### Sandbox Controls
- Parameter sliders for all machine, thread, environment settings
- Pattern import from images
- Preset modes: Cotton, Silk, High Speed, Fault Simulation
- Terminal commands for advanced control
- Optimization modes: Quality-first, Speed-first, Balanced, Low-energy

### Demo Mode
If FIWARE relay is unavailable, the system automatically switches to Demo Mode with procedural mock data.

---

## License

This project is for educational and research purposes.

---

## Version

Current: 1.0.0
