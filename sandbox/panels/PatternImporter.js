function PatternImporter(container) {
  this.container = container;
  this.render();
}

PatternImporter.prototype.render = function() {
  this.container.innerHTML = '<div class="pattern-importer">' +
    '<div class="pattern-dropzone" id="pattern-dropzone">' +
    '<div class="pattern-dropzone-text">Drop pattern image here or click to browse</div>' +
    '<div class="pattern-dropzone-hint">PNG, JPG, BMP (monochrome preferred)</div>' +
    '<input type="file" id="pattern-input" accept="image/*" style="display:none"></div>' +
    '<div class="pattern-preview" id="pattern-preview" style="display:none">' +
    '<canvas id="pattern-canvas"></canvas>' +
    '<div class="pattern-info" id="pattern-info"></div></div></div>';
  this.init();
};

PatternImporter.prototype.init = function() {
  const _this = this;
  const dropzone = document.getElementById('pattern-dropzone');
  const input = document.getElementById('pattern-input');

  dropzone.addEventListener('click', function() { input.click(); });
  dropzone.addEventListener('dragover', function(e) { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', function() { dropzone.classList.remove('dragover'); });
  dropzone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) _this.loadImage(file);
  });

  input.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) _this.loadImage(file);
  });

  EventBus.on('pattern:loaded', function(data) { _this.showPreview(data); });
};

PatternImporter.prototype.loadImage = function(file) {
  const _this = this;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const matrix = _this.imageToMatrix(img, 64, 64);
      const analysis = _this.analyzePattern(matrix);
      state.state.pattern.matrix = matrix;
      state.state.pattern.matrixWidth = 64;
      state.state.pattern.matrixHeight = 64;
      state.state.pattern.complexity = analysis.complexity;
      EventBus.emit('pattern:loaded', { matrix: matrix, complexity: analysis.complexity });
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

PatternImporter.prototype.imageToMatrix = function(img, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height).data;
  const matrix = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const luminance = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
      matrix[y * width + x] = luminance < 128 ? 1 : 0;
    }
  }
  return matrix;
};

PatternImporter.prototype.analyzePattern = function(matrix) {
  let ones = 0;
  const total = matrix.length;
  for (let i = 0; i < total; i++) {
    if (matrix[i] === 1) ones++;
  }
  const p0 = 1 - ones / total;
  const p1 = ones / total;
  let entropy = 0;
  if (p0 > 0) entropy -= p0 * Math.log2(p0);
  if (p1 > 0) entropy -= p1 * Math.log2(p1);
  return { complexity: entropy };
};

PatternImporter.prototype.showPreview = function(data) {
  const preview = document.getElementById('pattern-preview');
  const canvas = document.getElementById('pattern-canvas');
  const info = document.getElementById('pattern-info');

  preview.style.display = 'block';
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);

  const matrix = state.state.pattern.matrix;
  const matrixWidth = state.state.pattern.matrixWidth;
  const matrixHeight = state.state.pattern.matrixHeight;
  if (!matrix) return;

  const step = 128 / matrixWidth;
  for (let y = 0; y < matrixHeight; y++) {
    for (let x = 0; x < matrixWidth; x++) {
      ctx.fillStyle = matrix[y * matrixWidth + x] === 1 ? '#00d4ff' : '#1a2030';
      ctx.fillRect(x * step, y * step, step, step);
    }
  }
  info.textContent = 'Size: ' + matrixWidth + '×' + matrixHeight + ' | Complexity: ' + (data.complexity || 0).toFixed(2);
};

window.PatternImporter = PatternImporter;