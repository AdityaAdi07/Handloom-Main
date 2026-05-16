function EffectsController(scene, camera, shuttleController) {
  this.scene = scene;
  this.camera = camera;
  this.shuttleController = shuttleController;
  this.baseCameraPos = camera.position.clone();
  this.frameOriginalPos = scene.position.clone();
  const _this = this;

  EventBus.on('param:environment.vibration', function(data) { _this.onVibrationChange(data.new); });
  EventBus.on('param:environment.temperature', function(data) { _this.onTemperatureChange(data.new); });
  EventBus.on('param:environment.humidity', function(data) { _this.onHumidityChange(data.new); });
  EventBus.on('fault:injected', function() { _this.onFaultInjected(); });
  EventBus.on('fault:cleared', function() { _this.onFaultCleared(); });
}

EffectsController.prototype.onVibrationChange = function(vibration) {
  const intensity = Math.max(0, vibration - 1.0);
  if (intensity > 3.0) {
    this.cameraShake = true;
    this.shakeIntensity = (intensity - 3.0) * 0.05;
  } else {
    this.cameraShake = false;
  }
};

EffectsController.prototype.onTemperatureChange = function(temp) {
  if (temp > 55) {
    this.scene.fog = new THREE.FogExp2(0xfff0e0, 0.025 + (temp - 55) * 0.002);
  } else if (temp > 45) {
    this.scene.fog = new THREE.FogExp2(0xffffff, 0.025 + (temp - 45) * 0.001);
  } else {
    this.scene.fog = new THREE.FogExp2(0xffffff, 0.025);
  }
};

EffectsController.prototype.onHumidityChange = function(humidity) {
  if (humidity > 80) {
    this.scene.fog = new THREE.FogExp2(0xe0f0ff, this.scene.fog && this.scene.fog.density ? this.scene.fog.density + 0.001 : 0.026);
  }
};

EffectsController.prototype.onFaultInjected = function() {
  this.faultFlash = true;
};

EffectsController.prototype.onFaultCleared = function() {
  this.faultFlash = false;
  this.scene.fog = new THREE.FogExp2(0xffffff, 0.025);
};

EffectsController.prototype.update = function(time) {
  const vibration = state.get('environment.vibration');

  if (vibration > 1.0) {
    const shake = Math.sin(time * 0.01) * (vibration - 1.0) * 0.01;
    this.scene.position.x = this.frameOriginalPos.x + shake;
    this.scene.position.y = this.frameOriginalPos.y + Math.cos(time * 0.013) * (vibration - 1.0) * 0.005;
  } else {
    this.scene.position.copy(this.frameOriginalPos);
  }

  if (this.cameraShake) {
    this.camera.position.x = this.baseCameraPos.x + (Math.random() - 0.5) * this.shakeIntensity;
    this.camera.position.y = this.baseCameraPos.y + (Math.random() - 0.5) * this.shakeIntensity;
  }
};

window.EffectsController = EffectsController;