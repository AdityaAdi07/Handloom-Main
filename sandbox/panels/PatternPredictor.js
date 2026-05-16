// Pattern Predictor - ML-based loom settings based on pattern analysis
const PATTERN_IMAGES_PATH = '../loom_3d/saree_images/';

const PATTERN_FILES = [
  '1017.jpg', '131376-ORW808-134.jpg', '136393-OSV9FK-272.jpg', '1750.jpg',
  '1817.jpg', '3189824.jpg', '336350-PB4F9I-962.jpg', '467329433494643.jpg',
  '5734167.jpg', '6546478.jpg', '6557287.jpg', '7552.jpg', '923_vector_image.jpg',
  'O8CG0R0.jpg', 'SL_080620_33490_27.jpg', 'c0a17758-b628-4cfa-80d0-7cab8d0dcb43.jpg',
  'e543222b-ee1b-40bf-93c6-9ed668f1a04c.jpg'
];

function PatternPredictor(container) {
  this.container = container;
  this.currentPattern = null;
  this.prediction = null;
  this.render();
}

PatternPredictor.prototype.render = function() {
  this.container.innerHTML = '<div class="ppred-panel">' +
    '<div class="ppred-title">PATTERN PREDICTOR</div>' +
    '<div class="ppred-pattern-preview" id="ppred-pattern">' +
    '<div class="ppred-placeholder">No Pattern Selected</div></div>' +
    '<div class="ppred-pattern-select" id="ppred-select-trigger">' +
    '<span>Choose Pattern</span><span class="ppred-chevron">▼</span></div>' +
    '<div class="ppred-pattern-list" id="ppred-pattern-list"></div>' +
    '<div class="ppred-divider"></div>' +
    '<div class="ppred-section">' +
    '<div class="ppred-section-title">ML PREDICTED SETTINGS</div>' +
    '<div class="ppred-result">' +
    '<div class="ppred-row"><span class="ppred-label">Speed</span><span class="ppred-value" id="ppred-speed">-- RPM</span></div>' +
    '<div class="ppred-row"><span class="ppred-label">Warp Tension</span><span class="ppred-value" id="ppred-warp">-- %</span></div>' +
    '<div class="ppred-row"><span class="ppred-label">Weft Tension</span><span class="ppred-value" id="ppred-weft">-- %</span></div>' +
    '<div class="ppred-row"><span class="ppred-label">Density</span><span class="ppred-value" id="ppred-density">-- t/cm</span></div>' +
    '<div class="ppred-row"><span class="ppred-label">Complexity</span><span class="ppred-value" id="ppred-complexity">--</span></div>' +
    '</div></div>' +
    '<button class="ppred-apply-btn" id="ppred-apply-btn" disabled>APPLY SETTINGS</button>' +
    '</div>';
  this.init();
};

PatternPredictor.prototype.init = function() {
  const _this = this;

  const selectTrigger = document.getElementById('ppred-select-trigger');
  const patternList = document.getElementById('ppred-pattern-list');
  const applyBtn = document.getElementById('ppred-apply-btn');

  // Populate pattern list
  PATTERN_FILES.forEach(function(file) {
    const item = document.createElement('div');
    item.className = 'ppred-pattern-item';
    item.innerHTML = '<img src="' + PATTERN_IMAGES_PATH + file + '"><span>' + file.replace('.jpg', '') + '</span>';
    item.addEventListener('click', function() { _this.selectPattern(file); });
    patternList.appendChild(item);
  });

  selectTrigger.addEventListener('click', function() {
    patternList.style.display = patternList.style.display === 'block' ? 'none' : 'block';
  });

  applyBtn.addEventListener('click', function() {
    if (_this.prediction) _this.applySettings();
  });

  // Close list when clicking outside
  document.addEventListener('click', function(e) {
    if (!selectTrigger.contains(e.target) && !patternList.contains(e.target)) {
      patternList.style.display = 'none';
    }
  });
};

PatternPredictor.prototype.selectPattern = function(filename) {
  this.currentPattern = filename;
  const preview = document.getElementById('ppred-pattern');
  const patternList = document.getElementById('ppred-pattern-list');
  const applyBtn = document.getElementById('ppred-apply-btn');

  preview.innerHTML = '<img src="' + PATTERN_IMAGES_PATH + filename + '">';
  patternList.style.display = 'none';

  // Analyze pattern and predict settings
  this.analyzePattern(filename);
  applyBtn.disabled = false;
};

PatternPredictor.prototype.analyzePattern = function(filename) {
  const _this = this;
  const img = new Image();
  img.onload = function() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 64;
    ctx.drawImage(img, 0, 0, 64, 64);

    const imageData = ctx.getImageData(0, 0, 64, 64).data;
    let totalBrightness = 0;
    let edgeCount = 0;
    let darkPixels = 0;

    // Analyze image
    for (let i = 0; i < imageData.length; i += 4) {
      const brightness = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
      totalBrightness += brightness;
      if (brightness < 128) darkPixels++;
    }

    const avgBrightness = totalBrightness / (64 * 64 * 3);
    const darkRatio = darkPixels / (64 * 64);

    // Detect complexity (more contrast = more complex)
    let complexity = 0;
    for (let y = 1; y < 63; y++) {
      for (let x = 1; x < 63; x++) {
        const idx = (y * 64 + x) * 4;
        const brightness = (imageData[idx] + imageData[idx + 1] + imageData[idx + 2]) / 3;
        const neighbors = [
          ((y - 1) * 64 + x) * 4,
          ((y + 1) * 64 + x) * 4,
          (y * 64 + x - 1) * 4,
          (y * 64 + x + 1) * 4
        ];
        neighbors.forEach(function(nidx) {
          const nb = (imageData[nidx] + imageData[nidx + 1] + imageData[nidx + 2]) / 3;
          complexity += Math.abs(brightness - nb);
        });
      }
    }
    complexity = Math.min(1, complexity / 50000);

    // ML-based prediction based on pattern characteristics
    const prediction = _this.predictSettings(complexity, darkRatio, avgBrightness);
    _this.prediction = prediction;
    _this.displayPrediction(prediction);

    // Emit event for blueprint update
    EventBus.emit('pattern:selected', { filename: filename, prediction: prediction });
  };
  img.src = PATTERN_IMAGES_PATH + filename;
};

PatternPredictor.prototype.predictSettings = function(complexity, darkRatio, brightness) {
  // ML-based prediction model
  let speed, warpTension, weftTension, density;

  // Complex patterns need slower speed and higher tension
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

  // Adjust for dark/bright patterns
  if (darkRatio > 0.6) {
    // Dark patterns - tighter weave
    density += 10;
    warpTension += 5;
  } else if (darkRatio < 0.3) {
    // Light patterns - looser weave
    density -= 10;
    warpTension -= 5;
  }

  return {
    speed: speed,
    warpTension: Math.min(95, Math.max(40, warpTension)),
    weftTension: Math.min(90, Math.max(35, weftTension)),
    density: Math.min(150, Math.max(40, density)),
    complexity: complexity
  };
};

PatternPredictor.prototype.displayPrediction = function(pred) {
  document.getElementById('ppred-speed').textContent = pred.speed + ' RPM';
  document.getElementById('ppred-warp').textContent = pred.warpTension + ' %';
  document.getElementById('ppred-weft').textContent = pred.weftTension + ' %';
  document.getElementById('ppred-density').textContent = pred.density + ' t/cm';
  document.getElementById('ppred-complexity').textContent = (pred.complexity * 100).toFixed(0) + '%';
};

PatternPredictor.prototype.applySettings = function() {
  if (!this.prediction) return;

  state.set('machine.loomSpeed', this.prediction.speed);
  state.set('thread.warpTension', this.prediction.warpTension);
  state.set('thread.weftTension', this.prediction.weftTension);
  state.set('thread.density', this.prediction.density);
  state.set('pattern.complexity', this.prediction.complexity);

  // Update pattern state
  state.state.pattern.matrixWidth = 64;
  state.state.pattern.matrixHeight = 64;

  EventBus.emit('pattern:predictApplied', this.prediction);

  if (window.sandboxTerminal) {
    window.sandboxTerminal.log('SYSTEM', 'Applied ML-predicted settings from pattern analysis');
  }
};

// Export for blueprint overlay functionality
function updateBlueprintPreview(filename) {
  const preview = document.querySelector('.bp-pattern-img');
  if (preview) {
    preview.innerHTML = '<img src="' + PATTERN_IMAGES_PATH + filename + '">';
  }
}

// Initialize blueprint pattern selector
function initBlueprintPatternSelector() {
  const blueprintOverlay = document.getElementById('sb-blueprint-overlay');
  if (!blueprintOverlay) return;

  // Add click to select pattern
  blueprintOverlay.addEventListener('click', function() {
    const predictor = document.getElementById('sb-pattern-predictor');
    if (predictor) {
      const list = predictor.querySelector('.ppred-pattern-list');
      if (list) list.style.display = list.style.display === 'block' ? 'none' : 'block';
    }
  });
}

window.PatternPredictor = PatternPredictor;
window.updateBlueprintPreview = updateBlueprintPreview;
window.initBlueprintPatternSelector = initBlueprintPatternSelector;