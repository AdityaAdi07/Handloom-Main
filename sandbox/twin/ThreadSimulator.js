const TENSION_COLORS = {
  low: 0x4fc3f7,
  normal: 0xe8d5b7,
  high: 0xffa726,
  critical: 0xf44336,
};

function getTensionColor(tension) {
  if (tension < 30) return TENSION_COLORS.low;
  if (tension < 70) return TENSION_COLORS.normal;
  if (tension < 90) return TENSION_COLORS.high;
  return TENSION_COLORS.critical;
}

function ThreadSimulator(scene) {
  this.scene = scene;
  this.warpThreads = [];
  this.threadGroup = new THREE.Group();
  this.scene.add(this.threadGroup);
  this.MAX_SAG = 0.3;
  this.initializeThreads();
}

ThreadSimulator.prototype.initializeThreads = function() {
  const count = Math.min(state.get('thread.density'), 200);
  const width = 4.5;
  const depth = 2.6;
  const spacing = width / (count - 1);

  for (let i = 0; i < count; i++) {
    const tension = state.get('thread.warpTension');
    const sag = (1.0 - tension / 100) * this.MAX_SAG;
    const color = getTensionColor(tension);

    const threadMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.9,
      metalness: 0.0,
    });

    const controlPoints = [
      new THREE.Vector3(-width / 2 + i * spacing, 4.6, 2.6),
      new THREE.Vector3(-width / 2 + i * spacing, 2.5 - sag, 1.3),
      new THREE.Vector3(-width / 2 + i * spacing, 4.6, 0),
    ];

    const curve = new THREE.CatmullRomCurve3(controlPoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 20, state.get('thread.thickness') * 0.05, 4, false);
    const thread = new THREE.Mesh(tubeGeo, threadMat);
    thread.castShadow = true;
    this.warpThreads.push(thread);
    this.threadGroup.add(thread);
  }
};

ThreadSimulator.prototype.update = function() {
  const tension = state.get('thread.warpTension');
  const color = getTensionColor(tension);

  this.warpThreads.forEach(function(thread) {
    thread.material.color.setHex(color);
  });
};

ThreadSimulator.prototype.injectThreadBreak = function(breakIndex) {
  if (breakIndex >= 0 && breakIndex < this.warpThreads.length) {
    const thread = this.warpThreads[breakIndex];
    thread.material.color.setHex(TENSION_COLORS.critical);
    thread.material.emissive = new THREE.Color(TENSION_COLORS.critical);
    thread.material.emissiveIntensity = 0.5;
  }
};

ThreadSimulator.prototype.clearFault = function() {
  this.warpThreads.forEach(function(thread) {
    thread.material.emissiveIntensity = 0;
  });
  this.update();
};

window.ThreadSimulator = ThreadSimulator;