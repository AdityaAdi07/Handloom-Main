function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.FogExp2(0xffffff, 0.025);

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 3, 8);
  camera.lookAt(0, 1, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(6, 10, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x2040ff, 0.3);
  fillLight.position.set(-5, 3, -3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x00e5ff, 0.4);
  rimLight.position.set(0, 6, -8);
  scene.add(rimLight);

  const heatLight = new THREE.PointLight(0xff4400, 0, 10);
  heatLight.position.set(0, 4, 0);
  scene.add(heatLight);

  const accentLights = []; // Keep for compatibility

  const groundGeo = new THREE.PlaneGeometry(40, 40);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf1, roughness: 0.95, metalness: 0.05 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(30, 30, 0x1a2030, 0x121820);
  grid.position.y = 0.001;
  scene.add(grid);

  return { scene: scene, camera: camera, renderer: renderer, accentLights: accentLights, heatLight: heatLight };
}

function CameraController(camera, renderer) {
  this.camera = camera;
  this.renderer = renderer;
  this.mode = 'macro';
  this.orbit = {
    theta: 0.5, phi: 1.0, radius: 12,
    target: new THREE.Vector3(0, 1, 0),
    rotating: false, panning: false,
    lastX: 0, lastY: 0,
  };
  this.setupControls();
}

CameraController.prototype.setupControls = function() {
  const _this = this;
  const el = this.renderer.domElement;

  el.addEventListener('mousedown', function(e) {
    if (e.button === 0) _this.orbit.rotating = true;
    if (e.button === 2) _this.orbit.panning = true;
    _this.orbit.lastX = e.clientX;
    _this.orbit.lastY = e.clientY;
  });

  el.addEventListener('mousemove', function(e) {
    const dx = e.clientX - _this.orbit.lastX;
    const dy = e.clientY - _this.orbit.lastY;
    _this.orbit.lastX = e.clientX;
    _this.orbit.lastY = e.clientY;

    if (_this.orbit.rotating) {
      _this.orbit.theta -= dx * 0.008;
      _this.orbit.phi = Math.max(0.2, Math.min(Math.PI - 0.1, _this.orbit.phi + dy * 0.008));
    }
    if (_this.orbit.panning) {
      const right = new THREE.Vector3().crossVectors(
        new THREE.Vector3().subVectors(_this.orbit.target, _this.camera.position).normalize(),
        _this.camera.up
      ).normalize();
      _this.orbit.target.addScaledVector(right, -dx * 0.015);
      _this.orbit.target.y += dy * 0.015;
    }
    _this.updateCamera();
  });

  window.addEventListener('mouseup', function() { _this.orbit.rotating = _this.orbit.panning = false; });

  el.addEventListener('wheel', function(e) {
    _this.orbit.radius = Math.max(3, Math.min(30, _this.orbit.radius + e.deltaY * 0.02));
    _this.updateCamera();
  }, { passive: true });

  el.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  window.addEventListener('keydown', function(e) {
    if (e.key.toLowerCase() === 'm') _this.toggleMode();
  });
};

CameraController.prototype.updateCamera = function() {
  const o = this.orbit;
  const x = o.radius * Math.sin(o.phi) * Math.sin(o.theta);
  const y = o.radius * Math.cos(o.phi);
  const z = o.radius * Math.sin(o.phi) * Math.cos(o.theta);
  this.camera.position.set(o.target.x + x, o.target.y + y, o.target.z + z);
  this.camera.lookAt(o.target);
};

CameraController.prototype.toggleMode = function() {
  this.mode = this.mode === 'macro' ? 'micro' : 'macro';
  if (this.mode === 'micro') {
    this.orbit.radius = 3;
    this.orbit.target.set(0, 0.5, 1);
  } else {
    this.orbit.radius = 12;
    this.orbit.target.set(0, 1, 0);
  }
  this.updateCamera();
};

CameraController.prototype.setMode = function(mode) {
  this.mode = mode;
  if (mode === 'micro') {
    this.orbit.radius = 3;
    this.orbit.target.set(0, 0.5, 1);
  } else {
    this.orbit.radius = 12;
    this.orbit.target.set(0, 1, 0);
  }
  this.updateCamera();
};

window.createScene = createScene;
window.CameraController = CameraController;