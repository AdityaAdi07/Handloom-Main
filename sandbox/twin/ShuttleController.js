function ShuttleController(shuttle, warpWidth, scene) {
  this.shuttle = shuttle;
  this.warpWidth = warpWidth;
  this.scene = scene;
  this.shuttlePhase = 0;
  this.currentSpeed = 0;
  this.pickPosition = 0;
  this.setupShuttle();
}

ShuttleController.prototype.setupShuttle = function() {
  this.shuttle.position.set(0, 2.5, 1.25);
  this.scene.add(this.shuttle);
};

ShuttleController.prototype.update = function(dt) {
  const targetSpeed = state.get('machine.loomSpeed');
  this.currentSpeed += (targetSpeed - this.currentSpeed) * 0.05;

  const framesPerSecond = 60;
  const speedFactor = this.currentSpeed / 60;
  this.shuttlePhase += speedFactor * (2 * Math.PI) / framesPerSecond;

  const xPos = (this.warpWidth / 2) * Math.sin(this.shuttlePhase);
  this.shuttle.position.x = xPos;

  const speedRatio = this.currentSpeed / 300;
  this.shuttle.traverse(function(child) {
    if (child.isMesh && child.material) {
      if (!child.userData.materialCloned) {
        child.material = child.material.clone();
        child.userData.materialCloned = true;
      }
      child.material.emissive = new THREE.Color(0xc8860a);
      child.material.emissiveIntensity = speedRatio * 0.5;
    }
  });

  const atEdge = Math.abs(Math.sin(this.shuttlePhase)) > 0.95;
  if (atEdge) {
    this.pickPosition += 0.01;
  }
};

ShuttleController.prototype.getPickPosition = function() {
  return this.pickPosition;
};

window.ShuttleController = ShuttleController;