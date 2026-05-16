# Digital Twin API Test Cases
.\venv\Scripts\activate

# First, run data preprocessing
python run_preprocessing.py

# Next, train the models
python train_all.py

# Optionally, test the predictions to make sure it works
python test_preds.py

uvicorn api.main:app --reload



This file contains extreme, true-to-dataset test cases for each of your 5 endpoints. You can copy and paste the JSON blocks directly into the Swagger UI (`http://127.0.0.1:8000/docs`).

---

## 1. POST /predict/defect
*Predicts continuous defect rate.*

**Case A: Ideal Conditions (Expected: Very Low Defect Rate)**
```json
{
  "machine_speed": 110.0,
  "thread_warp_tension": 5.5,
  "thread_weft_tension": 5.2,
  "environment_temperature": 25.0,
  "environment_humidity": 60.0,
  "environment_vibration": 0.01,
  "energy_power": 650.0,
  "pattern_matrix": [[1, 0, 1], [0, 1, 0], [1, 1, 0]]
}
```

**Case B: Extreme Overheating & Stress (Expected: High Defect Rate)**
```json
{
  "machine_speed": 185.0,
  "thread_warp_tension": 9.5,
  "thread_weft_tension": 8.0,
  "environment_temperature": 48.0,
  "environment_humidity": 90.0,
  "environment_vibration": 0.85,
  "energy_power": 1350.0,
  "pattern_matrix": [[1, 0, 1], [0, 1, 0], [1, 1, 0]]
}
```

---

## 2. POST /predict/fault
*Predicts thread_break, overheat, motor_fault, or no_fault.*

**Case A: Healthy Machine (Expected: no_fault)**
```json
{
  "machine_speed": 134.0,
  "environment_vibration": 0.0646,
  "thread_warp_tension": 6.184,
  "thread_weft_tension": 5.921,
  "energy_power": 782.36,
  "control_speed_error": -5.0
}
```

**Case B: Motor Stalling (Expected: motor_fault)**
```json
{
  "machine_speed": 77.0,
  "environment_vibration": 0.6884,
  "thread_warp_tension": 10.42,
  "thread_weft_tension": 9.92,
  "energy_power": 713.52,
  "control_speed_error": -32.0
}
```

---

## 3. POST /predict/maintenance
*Predicts if maintenance is required based on faults and anomalies.*

**Case A: Brand New Run (Expected: false)**
```json
{
  "fault_anomaly_score": 0.076,
  "environment_vibration": 0.0646,
  "energy_power": 814.66,
  "machine_cycles": 1,
  "fault_thread_break": 0,
  "fault_motor_fault": 0,
  "fault_overheat": 0
}
```

**Case B: Heavy Wear & Motor Issues (Expected: true)**
```json
{
  "fault_anomaly_score": 0.8324,
  "environment_vibration": 0.6884,
  "energy_power": 713.52,
  "machine_cycles": 35716,
  "fault_thread_break": 0,
  "fault_motor_fault": 1,
  "fault_overheat": 0
}
```

**Case C: High Unseen Anomaly (Expected: true)**
```json
{
  "fault_anomaly_score": 0.99,
  "environment_vibration": 0.1,
  "energy_power": 710.0,
  "machine_cycles": 80000,
  "fault_thread_break": 0,
  "fault_motor_fault": 0,
  "fault_overheat": 0
}
```

---

## 4. POST /predict/quality
*Predicts fabric quality (A, B, C, D).*

**Case A: Pristine Quality Grade A**
```json
{
  "thread_warp_tension": 5.75,
  "thread_weft_tension": 5.341,
  "machine_speed": 134.0,
  "environment_humidity": 69.08,
  "production_defect_rate": 0.0158,
  "pattern_matrix": [[1, 0, 1], [0, 1, 0], [1, 1, 0]]
}
```

**Case B: Unusable Grade D**
```json
{
  "thread_warp_tension": 30.405,
  "thread_weft_tension": 36.191,
  "machine_speed": 129.0,
  "environment_humidity": 64.88,
  "production_defect_rate": 0.99,
  "pattern_matrix": [[1, 0, 1], [0, 1, 0], [1, 1, 0]]
}
```

---

## 5. GET /optimize
*Type these into the Swagger UI query fields to find optimal settings.*

**Case A: High Heat & Humidity**
*   temperature: `48.0`
*   humidity: `90.0`
*   vibration: `0.85`
*   yarn_type: `silk`

**Case B: Ideal Conditions**
*   temperature: `24.0`
*   humidity: `60.0`
*   vibration: `0.01`
*   yarn_type: `polyester`
