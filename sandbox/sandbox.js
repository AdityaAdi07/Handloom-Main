class SandboxApp {
  constructor() {
    this.viewport = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.cameraController = null;
    this.shuttleController = null;
    this.threadSimulator = null;
    this.effectsController = null;
  }

  static get PATTERN_IMAGES_PATH() { return '../loom_3d/saree_images/'; }

  init() {
    try {
      this.initState();
      this.renderUI();
      this.initViewport();
      this.init3D();
      this.initPanels();
      this.startSimulation();
      this.setupEventListeners();
      console.log('[Sandbox] Initialized');
    } catch(e) {
      console.error('[Sandbox] Init error:', e);
      throw e;
    }
  }

  initState() {
    paramEngine.updateEstimation();
  }

  renderUI() {
    const app = document.getElementById('sandbox-app');
    if (!app) {
      console.error('Sandbox app container not found');
      return;
    }

    document.body.classList.add('light-mode');
    app.innerHTML = '<div id="sb-header">' +
      '<div class="sb-logo">Sandbox <span>//</span> Control Panel</div>' +
      '<div class="sb-header-right">' +
      '<button id="theme-toggle" class="theme-btn">🌙</button>' +
      '<button class="sb-mode-btn" id="sb-mode-toggle"><span class="sb-mode-indicator"></span><span id="sb-mode-text">SANDBOX MODE</span></button>' +
      '<div class="sb-timestamp" id="sb-timestamp">--:--:--</div></div></div>' +

      '<div id="sb-main">' +
      '<div id="sb-content-wrapper">' +
      '<div id="sb-top-row">' +
      '<aside id="sb-control-panel"></aside>' +
      '<main id="sb-viewport"><div id="sb-3d-container"></div>' +
      '<div id="sb-view-controls">' +
      '<button class="sb-view-btn active" data-view="macro">MACRO</button>' +
      '<button class="sb-view-btn" data-view="micro">MICRO</button>' +
      '<button class="sb-view-btn" id="sb-reset-cam">RESET</button></div>' +
      '<div id="sb-left-overlays">' +
      '<div id="sb-blueprint-overlay">' +
      '<div class="bp-header">LIVE BLUEPRINT</div>' +
      '<div class="bp-pattern-container" id="bp-dropzone">' +
      '<div class="bp-pattern-img" id="bp-pattern-img"></div>' +
      '<div class="bp-upload-overlay" id="bp-upload-overlay">' +
      '<div class="bp-upload-icon">📁</div>' +
      '<div class="bp-upload-text">Drop pattern or click</div></div>' +
      '<div class="bp-progress-line"></div></div>' +
      '<input type="file" id="bp-file-input" accept="image/*" style="display:none"></input>' +
      '</div>' +
      '<div id="sb-analytics-overlay" class="sb-view-overlay-btn" title="Analytics & Reports">' +
      'ANALYTICS</div>' +
      '<div id="sb-ai-overlay" class="sb-view-overlay-btn" title="AI Intelligence">' +
      'AI INTELLIGENCE</div>' +
      '</div>' +
      '<div id="sb-predictor-overlay">' +
      '<div id="sb-pattern-predictor"></div></div>' +
      '<div id="sb-analytics-container"></div>' +
      '<div id="sb-ai-container"></div>' +
      '</main>' +
      '</div>' +
      '<div id="sb-bottom-row">' +
      '<div id="sb-prediction-panel"></div>' +
      '<div id="sb-telemetry-row"></div></div>' +
      '<div id="sb-preset-bar"></div>' +
      '</div>' +
      '<aside id="sb-right-panels">' +
      '<div id="sb-optimization-panel"></div>' +
      '<div id="sb-fabric-estimator"></div>' +
      '<div id="sb-terminal-container"></div></aside></div>' +

      '<div id="sb-pattern-modal" class="sb-modal">' +
      '<div class="sb-modal-content">' +
      '<div class="sb-modal-header"><span>Pattern Importer</span>' +
      '<button class="sb-modal-close" id="sb-modal-close-btn">X</button></div>' +
      '<div id="sb-pattern-container"></div></div></div>' +

      '<div id="sb-fault-overlay"></div>';
  }

  initViewport() {
    const container = document.getElementById('sb-3d-container');
    if (!container) return;

    const result = createScene(container);
    this.scene = result.scene;
    this.camera = result.camera;
    this.renderer = result.renderer;
    this.heatLight = result.heatLight;

    this.cameraController = new CameraController(this.camera, this.renderer);

    const _this = this;
    window.addEventListener('resize', function() {
      if (container) {
        _this.camera.aspect = container.clientWidth / container.clientHeight;
        _this.camera.updateProjectionMatrix();
        _this.renderer.setSize(container.clientWidth, container.clientHeight);
      }
    });
  }

  init3D() {
    if (!this.scene) return;

    const loom = buildLoom();
    this.scene.add(loom);

    const shuttle = createShuttle();
    this.shuttleController = new ShuttleController(shuttle, 4.5, this.scene);

    const warpThreads = createWarpThreads(80, 4.5, 2.6);
    this.scene.add(warpThreads);

    this.threadSimulator = new ThreadSimulator(this.scene);

    this.effectsController = new EffectsController(this.scene, this.camera, this.shuttleController);

    const _this = this;
    simulationLoop.add(function() {
      _this.renderer.render(_this.scene, _this.camera);
    }, 0);

    simulationLoop.add(function(dt) {
      if (_this.shuttleController) _this.shuttleController.update(dt);
      if (_this.threadSimulator) _this.threadSimulator.update();
      if (_this.effectsController) _this.effectsController.update(performance.now());
      const temp = state.get('environment.temperature');
      if (_this.heatLight) _this.heatLight.intensity = Math.max(0, (temp - 40) / 20) * 2;
    }, 1);
  }

  initPanels() {
    const controlPanelEl = document.getElementById('sb-control-panel');
    if (controlPanelEl) new ControlPanel(controlPanelEl);

    const predictionPanelEl = document.getElementById('sb-prediction-panel');
    if (predictionPanelEl) new PredictionPanel(predictionPanelEl);

    const terminalEl = document.getElementById('sb-terminal-container');
    if (terminalEl) {
      window.sandboxTerminal = new Terminal(terminalEl);
    }

    const presetBarEl = document.getElementById('sb-preset-bar');
    if (presetBarEl) new PresetManager(presetBarEl);

    const telemetryEl = document.getElementById('sb-telemetry-row');
    if (telemetryEl) new TelemetryDashboard(telemetryEl);

    const patternContainer = document.getElementById('sb-pattern-container');
    if (patternContainer) new PatternImporter(patternContainer);

    const fabricEl = document.getElementById('sb-fabric-estimator');
    if (fabricEl) new FabricSizeEstimator(fabricEl);

    const optEl = document.getElementById('sb-optimization-panel');
    if (optEl) new OptimizationEngine(optEl);

    const patternPredEl = document.getElementById('sb-pattern-predictor');
    if (patternPredEl) new PatternPredictor(patternPredEl);

    const analyticsContainer = document.getElementById('sb-analytics-container');
    if (analyticsContainer) new AnalyticsEngine(analyticsContainer);

    const aiContainer = document.getElementById('sb-ai-container');
    if (aiContainer) new AIntelligencePanel(aiContainer);
  }

  startSimulation() {
    simulationLoop.start();

    const _this = this;
    setInterval(function() {
      const ts = document.getElementById('sb-timestamp');
      if (ts) ts.textContent = new Date().toTimeString().split(' ')[0];
    }, 1000);
  }

  setupEventListeners() {
    const _this = this;

    const modeBtn = document.getElementById('sb-mode-toggle');
    if (modeBtn) modeBtn.addEventListener('click', function() { sandboxIsolation.toggle(); });

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function() {
        document.body.classList.toggle('light-mode');
        themeBtn.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
      });
    }

    EventBus.on('state:mode:sandbox', function() { _this.updateModeUI('sandbox'); });
    EventBus.on('state:mode:live', function() { _this.updateModeUI('live'); });

    document.querySelectorAll('.sb-view-btn[data-view]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.sb-view-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        if (_this.cameraController) _this.cameraController.setMode(btn.dataset.view);
      });
    });

    const resetCam = document.getElementById('sb-reset-cam');
    if (resetCam) {
      resetCam.addEventListener('click', function() {
        if (_this.cameraController) _this.cameraController.setMode('macro');
        document.querySelectorAll('.sb-view-btn').forEach(function(b) {
          b.classList.toggle('active', b.dataset && b.dataset.view === 'macro');
        });
      });
    }

    EventBus.on('fault:injected', function(data) {
      const overlay = document.getElementById('sb-fault-overlay');
      if (overlay) overlay.classList.add('active');
      if (data && data.type === 'thread_break' && _this.threadSimulator) {
        const idx = Math.floor(Math.random() * 80);
        _this.threadSimulator.injectThreadBreak(idx);
      }
    });

    EventBus.on('fault:cleared', function() {
      const overlay = document.getElementById('sb-fault-overlay');
      if (overlay) overlay.classList.remove('active');
      if (_this.threadSimulator) _this.threadSimulator.clearFault();
    });

    const modalClose = document.getElementById('sb-modal-close-btn');
    if (modalClose) {
      modalClose.addEventListener('click', function() {
        document.getElementById('sb-pattern-modal').style.display = 'none';
      });
    }

    // Analytics and AI panel toggles
    const analyticsBtn = document.getElementById('sb-analytics-overlay');
    const aiBtn = document.getElementById('sb-ai-overlay');
    const analyticsContainer = document.getElementById('sb-analytics-container');
    const aiContainer = document.getElementById('sb-ai-container');

    if (analyticsBtn) {
      analyticsBtn.addEventListener('click', function() {
        analyticsContainer.style.display = analyticsContainer.style.display === 'block' ? 'none' : 'block';
        analyticsBtn.classList.toggle('active');
      });
    }

    if (aiBtn) {
      aiBtn.addEventListener('click', function() {
        aiContainer.style.display = aiContainer.style.display === 'block' ? 'none' : 'block';
        aiBtn.classList.toggle('active');
      });
    }

    // Initially hide panels
    if (analyticsContainer) analyticsContainer.style.display = 'none';
    if (aiContainer) aiContainer.style.display = 'none';

    // Blueprint pattern selector (drag/drop + click)
    const bpDropzone = document.getElementById('bp-dropzone');
    const bpFileInput = document.getElementById('bp-file-input');
    const bpUploadOverlay = document.getElementById('bp-upload-overlay');
    const bpPatternImg = document.getElementById('bp-pattern-img');

    if (bpDropzone && bpFileInput) {
      bpDropzone.addEventListener('click', function() { bpFileInput.click(); });
      bpDropzone.addEventListener('dragover', function(e) { e.preventDefault(); bpUploadOverlay.classList.add('visible'); });
      bpDropzone.addEventListener('dragleave', function() { bpUploadOverlay.classList.remove('visible'); });
      bpDropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        bpUploadOverlay.classList.remove('visible');
        var file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) _this.loadBlueprintPattern(file);
      });
      bpFileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (file) _this.loadBlueprintPattern(file);
      });
    }

    // Listen for pattern selection from predictor to update blueprint
    EventBus.on('pattern:selected', function(data) {
      if (bpPatternImg) {
        bpPatternImg.innerHTML = '<img src="' + SandboxApp.PATTERN_IMAGES_PATH + data.filename + '">';
      }
    });
  }

  loadBlueprintPattern(file) {
    var reader = new FileReader();
    var _this = this;
    reader.onload = function(e) {
      var bpPatternImg = document.getElementById('bp-pattern-img');
      if (bpPatternImg) bpPatternImg.innerHTML = '<img src="' + e.target.result + '">';

      // Analyze the pattern
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 64, 64);
        var imageData = ctx.getImageData(0, 0, 64, 64).data;
        var totalBrightness = 0, darkPixels = 0;
        for (var i = 0; i < imageData.length; i += 4) {
          var brightness = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
          totalBrightness += brightness;
          if (brightness < 128) darkPixels++;
        }
        var avgBrightness = totalBrightness / (64 * 64 * 3);
        var darkRatio = darkPixels / (64 * 64);
        var complexity = 0;
        for (var y = 1; y < 63; y++) {
          for (var x = 1; x < 63; x++) {
            var idx = (y * 64 + x) * 4;
            var brightness = (imageData[idx] + imageData[idx + 1] + imageData[idx + 2]) / 3;
            var nIdx = ((y - 1) * 64 + x) * 4;
            complexity += Math.abs(brightness - (imageData[nIdx] + imageData[nIdx + 1] + imageData[nIdx + 2]) / 3);
          }
        }
        complexity = Math.min(1, complexity / 50000);

        var prediction = _this.predictSettings(complexity, darkRatio, avgBrightness);

        // Update state
        state.set('machine.loomSpeed', prediction.speed);
        state.set('thread.warpTension', prediction.warpTension);
        state.set('thread.weftTension', prediction.weftTension);
        state.set('thread.density', prediction.density);
        state.set('pattern.complexity', prediction.complexity);

        EventBus.emit('pattern:predictApplied', prediction);
        if (window.sandboxTerminal) window.sandboxTerminal.log('SYSTEM', 'Analyzed uploaded pattern - applied ML-predicted settings');

        // Update predictor panel if exists
        var ppredPreview = document.getElementById('ppred-pattern');
        if (ppredPreview) ppredPreview.innerHTML = '<img src="' + e.target.result + '">';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  predictSettings(complexity, darkRatio, brightness) {
    var speed, warpTension, weftTension, density;
    if (complexity > 0.6) {
      speed = 80 + Math.round((1 - complexity) * 40);
      warpTension = 55 + Math.round(complexity * 15);
      weftTension = 50 + Math.round(complexity * 15);
      density = 90 + Math.round(complexity * 30);
    } else if (complexity > 0.3) {
      speed = 100 + Math.round((0.6 - complexity) * 100);
      warpTension = 60 + Math.round(complexity * 20);
      weftTension = 55 + Math.round(complexity * 20);
      density = 70 + Math.round(complexity * 40);
    } else {
      speed = 140 - Math.round(complexity * 80);
      warpTension = 65 + Math.round(complexity * 10);
      weftTension = 60 + Math.round(complexity * 10);
      density = 60 + Math.round(complexity * 30);
    }
    if (darkRatio > 0.6) { density += 10; warpTension += 5; }
    else if (darkRatio < 0.3) { density -= 10; warpTension -= 5; }
    return {
      speed: speed,
      warpTension: Math.min(95, Math.max(40, warpTension)),
      weftTension: Math.min(90, Math.max(35, weftTension)),
      density: Math.min(150, Math.max(40, density)),
      complexity: complexity
    };
  }

  updateModeUI(mode) {
    const indicator = document.querySelector('.sb-mode-indicator');
    const text = document.getElementById('sb-mode-text');
    if (indicator) indicator.className = 'sb-mode-indicator ' + mode;
    if (text) text.textContent = mode.toUpperCase() + ' MODE';
  }
}

window.SandboxApp = SandboxApp;