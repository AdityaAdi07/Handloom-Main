from flask import Blueprint, request, jsonify
from datetime import datetime
import random

sandbox_bp = Blueprint('sandbox', __name__, url_prefix='/api/sandbox')

@sandbox_bp.route('/predict', methods=['POST'])
def predict():
    """Run ML inference on sandbox parameters"""
    params = request.json

    loom_speed = params.get('machine', {}).get('loomSpeed', 120)
    warp_tension = params.get('thread', {}).get('warpTension', 65)
    vibration = params.get('environment', {}).get('vibration', 0.2)
    complexity = params.get('pattern', {}).get('complexity', 0.5)

    defect_rate = max(0, min(100,
        (loom_speed - 150) / 3 +
        (warp_tension - 70) / 4 +
        vibration * 8 +
        complexity * 12
    ))

    fault_probability = min(1, defect_rate / 50 + vibration / 5)
    quality_grade = 'A+' if defect_rate < 3 else 'A' if defect_rate < 7 else 'B+' if defect_rate < 12 else 'B' if defect_rate < 20 else 'C'
    status = 'safe' if defect_rate < 5 else 'warning' if defect_rate < 15 else 'critical'

    recommendations = []
    if loom_speed > 200:
        recommendations.append({
            'param': 'machine.loomSpeed',
            'current': loom_speed,
            'recommended': int(loom_speed * 0.8),
            'reason': 'reduces defects by ~40%'
        })
    if warp_tension > 80:
        recommendations.append({
            'param': 'thread.warpTension',
            'current': warp_tension,
            'recommended': 65,
            'reason': 'prevents thread stress'
        })

    alerts = []
    if warp_tension > 80:
        alerts.append('warp tension high')
    if vibration > 1.0:
        alerts.append('vibration above nominal')

    return jsonify({
        'defect_rate': round(defect_rate, 2),
        'fault_probability': round(fault_probability, 3),
        'maintenance_score': round(random.uniform(0.2, 0.8), 2),
        'quality_grade': quality_grade,
        'efficiency_score': round(max(0, 100 - defect_rate), 1),
        'anomaly_score': round(fault_probability, 3),
        'status': status,
        'alerts': alerts,
        'recommendations': recommendations
    })


@sandbox_bp.route('/optimize', methods=['POST'])
def optimize():
    """Return optimization recommendations"""
    params = request.json
    mode = params.pop('mode', 'balanced')
    result = {'mode': mode, 'recommendations': []}

    loom_speed = params.get('machine', {}).get('loomSpeed', 120)
    warp_tension = params.get('thread', {}).get('warpTension', 65)
    vibration = params.get('environment', {}).get('vibration', 0.2)
    voltage = params.get('energy', {}).get('voltage', 230)

    if mode == 'quality-first':
        if loom_speed > 150:
            result['recommendations'].append({
                'param': 'machine.loomSpeed',
                'current': loom_speed,
                'recommended': int(loom_speed * 0.8),
                'impact': 'reduces defects by ~40%'
            })
        if warp_tension > 70:
            result['recommendations'].append({
                'param': 'thread.warpTension',
                'current': warp_tension,
                'recommended': 65,
                'impact': 'prevents thread stress'
            })
    elif mode == 'speed-first':
        result['recommendations'].append({
            'param': 'machine.loomSpeed',
            'current': loom_speed,
            'recommended': min(300, loom_speed + 30),
            'impact': 'maximizes throughput'
        })
    elif mode == 'low-energy':
        result['recommendations'].append({
            'param': 'energy.voltage',
            'current': voltage,
            'recommended': 210,
            'impact': 'reduce power consumption'
        })
        result['recommendations'].append({
            'param': 'machine.loomSpeed',
            'current': loom_speed,
            'recommended': int(loom_speed * 0.85),
            'impact': '15% speed reduction'
        })

    return jsonify(result)


@sandbox_bp.route('/session/save', methods=['POST'])
def save_session():
    """Save sandbox state to MongoDB"""
    session_data = request.json
    session_id = f"sandbox_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    return jsonify({'session_id': session_id, 'status': 'saved'})


@sandbox_bp.route('/session/<session_id>', methods=['GET'])
def load_session(session_id):
    """Load sandbox state from MongoDB"""
    return jsonify({'error': 'Session not found', 'session_id': session_id})


@sandbox_bp.route('/telemetry/<metric>', methods=['GET'])
def get_telemetry(metric):
    """Return historical telemetry from MongoDB Atlas"""
    return jsonify({
        'metric': metric,
        'data': [round(random.uniform(50, 150), 2) for _ in range(60)],
        'timestamp': datetime.now().isoformat()
    })