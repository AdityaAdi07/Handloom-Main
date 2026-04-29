# Handloom Weaving Digital Twin 🚀🧶

A high-fidelity, real-time, physics-based Digital Twin of a traditional Handloom weaving process. This project leverages the **FIWARE Framework** for IoT telemetry ingestion and **Three.js** for an interactive, data-driven 3D web simulation.

## 🌟 Key Features
- **Real-Time 3D Simulation**: Procedurally generated 3D loom powered by WebGL/Three.js.
- **Micro-Level "Thread Core" View**: Zooms into the mechanical shedding, shuttle flight, and beat-up mechanics based on the active structural weave pattern (e.g., Twill, Satin, Basket).
- **FIWARE IoT Integration**: Connects to the Orion Context Broker to ingest live telemetry such as machine speed, thread tension, temperature, and vibration.
- **Dynamic Physics Integration**: Real-time visualization of thread sagging, tension variations, and potential thread breaks (defect rate simulation) using Catmull-Rom splines.
- **Premium UI & Themes**: A high-end responsive HUD featuring glowing gauge bars, canvas-based live charting, and a built-in synchronized Light/Dark Mode toggle.

---

## 🏗️ Architecture & Digital Twin Setup
<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/d47b6e20-3276-4a20-bd81-043660df791d" />
<img width="1688" height="823" alt="image" src="https://github.com/user-attachments/assets/b526f93d-fd8f-4cf1-81d9-875c1b56a789" />


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

### 🧮 Algorithms & Physics Applied
- **Catmull-Rom Splines**: Used to generate the continuous tubular 3D geometry for the weft threads. A mathematical curve drops the spline vertices down proportionally to `(5.0 - live_tension)`, visually simulating real-world thread sag and tension loss.
- **Linear Interpolation (Lerp)**: Used for the smooth transition animations of the mechanical shed (the alternating up/down of warp threads) bound by `MAX_SHED_ANGLE`.
- **Matrix Mapping Algorithm**: Converts 2D boolean matrices (e.g., `[1,0,1,0]`) into 3D mechanical positioning. `1` targets an "UP" position, and `0` targets a "DOWN" position to physically recreate twill, basket, and satin fabric structures in WebGL.

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

### 3. Launch the Application
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
