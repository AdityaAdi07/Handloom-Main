# Handloom Weaving Digital Twin 🚀🧶

A high-fidelity, real-time, physics-based Digital Twin of a traditional Handloom weaving process. This project leverages the **FIWARE Framework** for IoT telemetry ingestion and **Three.js** for an interactive, data-driven 3D web simulation.

## 🌟 Key Features
- **Real-Time 3D Simulation**: Procedurally generated 3D loom powered by WebGL/Three.js.
- **Micro-Level "Thread Core" View**: Zooms into the mechanical shedding, shuttle flight, and beat-up mechanics based on the active structural weave pattern (e.g., Twill, Satin, Basket).
- **FIWARE IoT Integration**: Connects to the Orion Context Broker to ingest live telemetry such as machine speed, thread tension, temperature, and vibration.
- **Dynamic Physics Integration**: Real-time visualization of thread sagging, tension variations, and potential thread breaks (defect rate simulation) using Catmull-Rom splines.
- **Premium UI & Themes**: A high-end responsive HUD featuring glowing gauge bars, canvas-based live charting, and a built-in synchronized Light/Dark Mode toggle.
- **Loom Intelligence Dashboard**: A dedicated analytics interface connecting the UI directly to a live FastAPI machine learning inference engine. Features interactive prediction controls, live telemetry overlays, and rich validation charts.

---

## 🏗️ Architecture & Digital Twin Setup

<img width="2816" height="1536" alt="Gemini_Generated_Image_jgfk3jjgfk3jjgfk" src="https://github.com/user-attachments/assets/2a7ae104-404d-46c0-9c43-1b11b00678b9" />


The architecture of this Digital Twin is split into three primary layers:

### 1. Data Ingestion & Context Management (FIWARE)
The core IoT backbone utilizes the **FIWARE ecosystem**:
- **Orion Context Broker**: Acts as the central hub for the system's context information, maintaining the live state of the loom entity (`Loom:01`).
- **MongoDB**: Used by Orion to persist context data.
- Sensors or IoT simulators push JSON payloads to Orion via the NGSI-v2 API, representing machine metrics and fabric patterns.
  

### 2. Middleware (Relay API)
A lightweight **Python Flask Relay** (`localhost:5050/twin`) bridges the gap between the FIWARE backend and the frontend. It polls Orion (`localhost:1026`), parses the NGSI-v2 payload, and serves a cleaned, minimal JSON object to the frontend client. This bypasses browser CORS restrictions and reduces frontend computational load.

### 3. Presentation & Simulation Layer (Frontend)
The frontend (`index.html` & `weave.html`) is built purely with Native JS, HTML, CSS, and **Three.js**.
- **Dashboard (`index.html`)**: The macroscopic view of the loom frame, featuring live dynamic gauge bars, historic canvas charts, glowing bounding boxes, rulers, and laser defect scanners.
- **Thread Core (`weave.html`)**: The microscopic interactive view simulating the mechanical interlacing of warp and weft threads based on matrix arrays.

<img width="1911" height="964" alt="Screenshot 2026-05-06 164157" src="https://github.com/user-attachments/assets/a7f3d0b8-5674-49d5-90ca-bad10aa42aa3" />
<img width="1914" height="968" alt="Screenshot 2026-05-06 164140" src="https://github.com/user-attachments/assets/19727690-e1d4-4ada-a69a-af0e8347a1e7" />


### 🧮 Algorithms & Physics Applied
- **Catmull-Rom Splines**: Used to generate the continuous tubular 3D geometry for the weft threads. A mathematical curve drops the spline vertices down proportionally to `(5.0 - live_tension)`, visually simulating real-world thread sag and tension loss.
- **Linear Interpolation (Lerp)**: Used for the smooth transition animations of the mechanical shed (the alternating up/down of warp threads) bound by `MAX_SHED_ANGLE`.
- **Matrix Mapping Algorithm**: Converts 2D boolean matrices (e.g., `[1,0,1,0]`) into 3D mechanical positioning. `1` targets an "UP" position, and `0` targets a "DOWN" position to physically recreate twill, basket, and satin fabric structures in WebGL.

---

## 🤖 AI & Predictive Models Architecture
<img width="1918" height="971" alt="Screenshot 2026-05-06 164133" src="https://github.com/user-attachments/assets/f5187a43-480c-4ef7-9ac3-a7ddea701fd2" />

The project integrates a comprehensive suite of machine learning models to power the predictive aspects of the Digital Twin, forming a complete **Digital Twin + AI Optimization System**.

### 1. Quality Prediction Model (Random Forest Classifier)
- **Input**: Machine (speed, cycles), Thread (tensions, yarn_type), Environment, Pattern matrices, Engineered features.
- **Output**: Quality Class (0=Reject, 1=Standard, 2=Premium, 3=Flawless).
- **Use**: Predicts fabric quality for optimization and the what-if simulator.

### 2. Defect Rate Model (Random Forest Regressor)
- **Input**: Same as Quality Model.
- **Output**: Continuous defect rate value (e.g., 0.25).
- **Use**: Predicts production defects to minimize errors.

### 3. Fault Detection Model (Random Forest Classifier)
- **Input**: Vibration, tensions, vibration_delta, tension_delta.
- **Output**: Fault Class (0=Normal, 1=Thread Break, 2=Motor Fault, 3=Overheat).
- **Use**: Early warning system for thread breaks or overheating.

### 4. Predictive Maintenance Model (Random Forest Classifier)
- **Input**: Anomaly score, vibration, tension, machine signals.
- **Output**: Maintenance requirement probability (0=Healthy, 1=Maintenance Req).
- **Use**: Decides when maintenance is required to reduce downtime.

### 5. Optimization Engine & Simulator (FastAPI)
*(Logic-based Integrations exposed via REST API)*
- **Optimization Engine**: Takes speed/tension ranges and outputs the best configuration by iterating through the Quality and Defect models.
- **What-If Simulator**: Takes user inputs from the UI and outputs interactive predictions (quality, defect, fault probability) in real-time.

### 🔄 Final ML Architecture Flow
```text
Raw Data ➔ Feature Engineering
       ↓
[ Quality | Defect | Fault | RPM | Anomaly | Maintenance ] Models
       ↓
Optimization + What-If Simulator
       ↓
UI Dashboard (Digital Twin)
```

---

## 💻 Technology Stack
- **Frontend**: HTML5, Vanilla JavaScript, CSS3
- **3D Graphics**: Three.js (r128)
- **IoT/Backend**: FIWARE Orion Context Broker, MongoDB
- **Middleware**: Python 3, Flask, Flask-CORS
- **Containerization**: Docker, Docker Compose

---

## 🧠 Core Backbone: FIWARE & Docker Integration

### 1. WHY FIWARE IN THIS DIGITAL TWIN
Without FIWARE, the system would be: `Dataset → Frontend (fake/static)`
With FIWARE: `Dataset → Real-time Engine → State Management → Live Twin`
👉 FIWARE = **central brain of the digital twin**

### 2. COMPONENT ROLES
- **MongoDB (Storage Layer)**: Stores all entity data and keeps current + historical state. *Acts as the memory of the digital twin.*
- **Orion Context Broker (Core Engine)**: The most important part. It manages entities (`Loom:01`), attributes (`speed`, `tension`), and real-time updates. *Acts as the real-time state manager.*
- **Docker**: Used to run MongoDB and Orion in isolated environments, preventing installation conflicts.

### 3. ORION CONTEXT BROKER LOGIC
This is where the digital twin becomes real.
- **ENTITY**: `{"id": "Loom:01", "type": "Loom"}` 👉 Represents one real loom machine.
- **ATTRIBUTES**: `"speed": { "value": 120 }` 👉 These are the sensor values.
- **CONTEXT**: The current state of the loom (speed + tension + vibration + faults).
- **UPDATE**: The Python script sends a `PATCH /v2/entities/Loom:01/attrs` request. 👉 This updates the state continuously.
- **QUERY**: The frontend performs a `GET` request to fetch the latest state.

### 4. FULL DATA FLOW (CRITICAL)
```text
Dataset (JSON)
    ↓
Python Streamer (IoT Simulator)
    ↓
Orion (Context Broker)
    ↓
MongoDB (Storage)
    ↓
Flask Relay (CORS)
    ↓
Frontend (3D Visual Twin)
```

### 5. THE STREAMER ROLE
The Python script acts as a fake IoT device. It reads the dataset row-by-row, converts it to FIWARE format, and sends updates.
*Example:* `machine.speed = 134` ➔ `{"speed": { "value": 134 }}`

### 6. WHY THIS IS A TRUE DIGITAL TWIN
- **Real-time state engine**: Always reflects the current machine condition. Orion is a live JSON database + API + state manager. It receives updates, stores latest values, and serves them instantly.
- **Decoupling**: Backend logic is entirely separated from the Frontend visualizer.
- **Scalability**: Multiple looms can be added seamlessly using standard IoT architecture.

*(Important Note: Orion does not calculate anything. It only stores what you send. If the streamer sends 0, Orion stores 0, and the frontend shows 0).*

---

## 🛠️ Setup & Execution Instructions

### 1. Start the FIWARE Stack (Docker)
Ensure you have Docker and Docker Compose installed on your machine.
From your root directory where `docker-compose.yml` is located, spin up the Orion and Mongo containers:
```bash
docker-compose up -d
```
*Verify Orion is running by visiting: `http://localhost:1026/version`*

### 2. Start the Python Relay
The frontend expects a local relay server at port `5050` to deliver the IoT data cleanly. Navigate to the directory containing your Python relay script and run:
```bash
pip install flask flask-cors requests
python app.py
```
*Verify the relay is active by visiting: `http://localhost:5050/twin`*

### 3. Start the Machine Learning Inference Backend (FastAPI)
The Loom Intelligence dashboard relies on a local FastAPI backend running the Random Forest predictive models.
Open a new terminal, activate your virtual environment, and start the server:
```bash
cd loom_3d/digital_twin
# Ensure dependencies are installed (fastapi, uvicorn, scikit-learn)
uvicorn api.main:app --reload
```
*Verify the ML backend is active by checking the Swagger UI at: `http://localhost:8000/docs`*

### 4. Launch the Application
Navigate to the frontend folder. Because the frontend uses cross-document communication (iframes and postMessage), it is highly recommended to serve the HTML files using a local HTTP server rather than opening them via the `file://` protocol.

Using Python's built-in server:
```bash
cd Fiware/frntend
python -m http.server 8000
```
Open your browser and navigate to: `http://localhost:8000/index.html`

*(Note: The system includes an intelligent fallback **Demo Mode**. If the FIWARE relay is unavailable or offline, the UI will automatically generate procedural mock telemetry to demonstrate the visual physics engines).*

---

## 🎨 Interacting with the Twin
- **Rotate/Pan**: Click and drag on the 3D canvas to rotate around the loom. Right-click and drag to pan.
- **Zoom**: Scroll the mouse wheel to zoom in and out.
- **View Micro-Mechanics**: Click on the woven fabric core inside the primary loom (your cursor will change to a pointer) to open the `weave.html` modal overlay showing thread-level physics.
- **Theme Toggle**: Use the ☀️/🌙 button in the top right of the dashboard to transition the entire UI, the 3D environment, the lighting, and the data charts between Light and Dark mode.
