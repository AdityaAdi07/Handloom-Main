const COMMANDS = {
  'help': function() { printCommandList(); },
  'status': function() { printSystemStatus(); },
  'clear': function() { clearTerminal(); },
  'reset': function() { resetToDefaults(); },
  'speed:increase': function() { patchState('machine.loomSpeed', s => Math.min(300, s + 20)); },
  'speed:decrease': function() { patchState('machine.loomSpeed', s => Math.max(0, s - 20)); },
  'speed:set': function() { window.sandboxTerminal.log('INFO', 'Use "set machine.loomSpeed <val>"'); },
  'vibration:reduce': function() { patchState('environment.vibration', s => Math.max(0, s - 0.5)); },
  'quality:optimize': function() { optimize('quality-first'); },
  'quality:balanced': function() { optimize('balanced'); },
  'fault:inject': function() { injectRandomFault(); },
  'fault:thread': function() { injectFault('thread_break'); },
  'fault:motor': function() { injectFault('motor_fault'); },
  'fault:power': function() { injectFault('power_spike'); },
  'view:macro': function() { EventBus.emit('camera:mode:macro'); },
  'view:micro': function() { EventBus.emit('camera:mode:micro'); },
  'est:time': function() { printEstimation(); },
};

const LOG_MESSAGES = [
  { type: 'TELEMETRY', template: 'speed={speed} RPM tension={tension}% defect={defect}%' },
  { type: 'INFO', template: 'Weft pick #{pick} inserted' },
  { type: 'WARN', template: 'Vibration elevated: {vib}g (nominal: <1.0g)', condition: function(s) { return s.environment.vibration > 1; } },
  { type: 'PRED', template: 'Defect probability updated: {defect}% → {status}' },
  { type: 'SYSTEM', template: 'Pattern matrix loaded: 64×64 (entropy=0.72)' },
  { type: 'ALERT', template: 'Temperature approaching threshold: {temp}°C', condition: function(s) { return s.environment.temperature > 40; } },
];

function Terminal(container) {
  this.container = container;
  this.history = [];
  this.historyIndex = -1;
  this.scrollback = [];
  this.maxScrollback = 500;
  this.pickCounter = 4000;
  this.render();
}

Terminal.prototype.render = function() {
  const _this = this;
  this.container.innerHTML = '<div class="term-header">' +
    '<span>TERMINAL</span>' +
    '<div class="term-controls"><button class="term-btn" id="term-clr-btn">CLR</button></div></div>' +
    '<div class="term-output" id="term-output"></div>' +
    '<div class="term-input-row"><span class="term-prompt">></span>' +
    '<div class="term-input-wrapper">' +
    '<div class="term-suggestions" id="term-suggestions"></div>' +
    '<input type="text" class="term-input" id="term-input" placeholder="type \'/\' for commands" autocomplete="off"></div></div>';

  document.getElementById('term-clr-btn').addEventListener('click', function() { _this.clear(); });
  this.init();
};

Terminal.prototype.init = function() {
  const _this = this;
  const input = document.getElementById('term-input');
  const suggestions = document.getElementById('term-suggestions');
  let selectedIndex = -1;

  const updateSuggestions = () => {
    const val = input.value;
    if (val.startsWith('/')) {
      const query = val.slice(1).toLowerCase();
      const matches = Object.keys(COMMANDS).filter(c => c.toLowerCase().includes(query));
      
      if (matches.length > 0) {
        suggestions.innerHTML = matches.map((m, i) => 
          `<div class="term-suggestion-item ${i === selectedIndex ? 'active' : ''}" data-cmd="${m}">${m}</div>`
        ).join('');
        suggestions.style.display = 'block';
      } else {
        suggestions.style.display = 'none';
      }
    } else {
      suggestions.style.display = 'none';
    }
  };

  input.addEventListener('input', () => {
    selectedIndex = -1;
    updateSuggestions();
  });

  suggestions.addEventListener('click', (e) => {
    const item = e.target.closest('.term-suggestion-item');
    if (item) {
      input.value = item.dataset.cmd;
      suggestions.style.display = 'none';
      input.focus();
    }
  });

  input.addEventListener('keydown', function(e) {
    const visibleItems = suggestions.querySelectorAll('.term-suggestion-item');
    
    if (suggestions.style.display === 'block' && visibleItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % visibleItems.length;
        updateSuggestions();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + visibleItems.length) % visibleItems.length;
        updateSuggestions();
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        input.value = visibleItems[selectedIndex].dataset.cmd;
        suggestions.style.display = 'none';
        return;
      } else if (e.key === 'Escape') {
        suggestions.style.display = 'none';
      }
    }

    if (e.key === 'Enter') {
      const cmd = input.value.trim();
      if (cmd) {
        _this.history.push(cmd);
        _this.historyIndex = _this.history.length;
        _this.execute(cmd);
      }
      input.value = '';
      suggestions.style.display = 'none';
    } else if (e.key === 'ArrowUp' && suggestions.style.display !== 'block') {
      e.preventDefault();
      if (_this.historyIndex > 0) {
        _this.historyIndex--;
        input.value = _this.history[_this.historyIndex];
      }
    } else if (e.key === 'ArrowDown' && suggestions.style.display !== 'block') {
      e.preventDefault();
      if (_this.historyIndex < _this.history.length - 1) {
        _this.historyIndex++;
        input.value = _this.history[_this.historyIndex];
      } else {
        _this.historyIndex = _this.history.length;
        input.value = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const val = input.value;
      const query = val.startsWith('/') ? val.slice(1).toLowerCase() : val.toLowerCase();
      const matches = Object.keys(COMMANDS).filter(function(c) { return c.startsWith(query); });
      if (matches.length === 1) input.value = (val.startsWith('/') ? '' : '') + matches[0];
    }
  });

  this.startLogging();
  this.log('SYSTEM', 'Sandbox terminal initialized. Type "help" for commands.');
};

Terminal.prototype.execute = function(cmd) {
  const _this = this;
  this.log('CMD', cmd);
  const handler = COMMANDS[cmd.toLowerCase()];
  if (handler) {
    try { handler(); } catch (e) { this.log('ERROR', e.message); }
  } else if (cmd.toLowerCase().startsWith('set ')) {
    const parts = cmd.split(' ');
    if (parts.length >= 3) {
      const path = parts[1];
      const value = parseFloat(parts[2]) || parts[2];
      state.set(path, value);
      this.log('OK', 'Set ' + path + ' = ' + value);
    }
  } else if (cmd.toLowerCase().startsWith('get ')) {
    const path = cmd.split(' ')[1];
    const val = state.get(path);
    this.log('INFO', path + ' = ' + JSON.stringify(val));
  } else {
    this.log('ERROR', 'Unknown command: ' + cmd);
  }
};

Terminal.prototype.log = function(type, message) {
  const output = document.getElementById('term-output');
  if (!output) return;
  const time = new Date().toTimeString().split(' ')[0];
  const line = document.createElement('div');
  
  let typeClass = type.toLowerCase();
  // Auto-detect important/anomaly messages
  const msgLower = message.toLowerCase();
  if (msgLower.includes('anomaly') || msgLower.includes('critical') || msgLower.includes('fault') || msgLower.includes('error') || msgLower.includes('break')) {
    typeClass += ' anomaly';
  }

  line.className = 'term-line ' + typeClass;
  line.innerHTML = '<span class="term-time">[' + time + ']</span> <span class="term-type">[' + type + ']</span> ' + message;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
  this.scrollback.push({ type: type, message: message, time: time });
  if (this.scrollback.length > this.maxScrollback) this.scrollback.shift();
};

Terminal.prototype.startLogging = function() {
  const _this = this;
  setInterval(function() {
    const s = state.state;
    const idx = Math.floor(Math.random() * LOG_MESSAGES.length);
    const msg = LOG_MESSAGES[idx];
    if (!msg.condition || msg.condition(s)) {
      let text = msg.template
        .replace('{speed}', s.machine.loomSpeed)
        .replace('{tension}', s.thread.warpTension)
        .replace('{defect}', (s.predictions.defectRate || 0).toFixed(1))
        .replace('{status}', s.predictions.status || 'safe')
        .replace('{vib}', s.environment.vibration.toFixed(1))
        .replace('{temp}', s.environment.temperature)
        .replace('{pick}', _this.pickCounter++);
      _this.log(msg.type, text);
    }
  }, 2000);
};

Terminal.prototype.clear = function() {
  const output = document.getElementById('term-output');
  if (output) output.innerHTML = '';
  this.log('SYSTEM', 'Terminal cleared');
};

function printCommandList() {
  if (window.sandboxTerminal) window.sandboxTerminal.log('HELP', 'Commands: help, status, clear, reset, increase speed, decrease speed, optimize quality/speed/balanced/energy, simulate fault/thread break/power spike/motor fault, macro view, micro view, estimate saree time, set <param> <value>, get <param>');
}

function printSystemStatus() {
  const s = state.state;
  if (window.sandboxTerminal) window.sandboxTerminal.log('STATUS', 'Mode: ' + s.simulation.mode + ' | Running: ' + s.simulation.running + ' | Speed: ' + s.machine.loomSpeed + ' RPM | Tension: ' + s.thread.warpTension + '% | Status: ' + s.predictions.status);
}

function clearTerminal() {
  if (window.sandboxTerminal) window.sandboxTerminal.clear();
}

function resetToDefaults() {
  state.reset();
  if (window.sandboxTerminal) window.sandboxTerminal.log('OK', 'State reset to defaults');
}

function patchState(path, fn) {
  const current = state.get(path);
  state.set(path, fn(current));
}

function injectFault(type) {
  state.set('simulation.faultInjected', true);
  state.set('simulation.faultType', type);
  EventBus.emit('fault:injected', { type: type });
  if (window.sandboxTerminal) window.sandboxTerminal.log('ALERT', 'Fault injected: ' + type);
}

function injectRandomFault() {
  const types = ['thread_break', 'motor_fault', 'power_spike'];
  injectFault(types[Math.floor(Math.random() * types.length)]);
}

function optimize(mode) {
  const s = state.state;
  let recs = [];
  if (mode === 'quality-first') {
    if (s.machine.loomSpeed > 150) recs.push({ param: 'machine.loomSpeed', current: s.machine.loomSpeed, recommended: Math.round(s.machine.loomSpeed * 0.8) });
    if (s.thread.warpTension > 70) recs.push({ param: 'thread.warpTension', current: s.thread.warpTension, recommended: 65 });
  } else if (mode === 'speed-first') {
    recs.push({ param: 'machine.loomSpeed', current: s.machine.loomSpeed, recommended: Math.min(300, s.machine.loomSpeed + 30) });
  } else if (mode === 'low-energy') {
    recs.push({ param: 'energy.voltage', current: s.energy.voltage, recommended: 210 });
    recs.push({ param: 'machine.loomSpeed', current: s.machine.loomSpeed, recommended: Math.round(s.machine.loomSpeed * 0.85) });
  }
  state.state.predictions.recommendations = recs;
  if (window.sandboxTerminal) window.sandboxTerminal.log('OPT', 'Optimization (' + mode + '): ' + recs.length + ' recommendations generated');
}

function printEstimation() {
  const e = state.state.estimation;
  if (window.sandboxTerminal) window.sandboxTerminal.log('EST', 'Est. time: ' + e.weavingTimeHours.toFixed(1) + 'h | Thread: ' + e.threadConsumptionM + 'm | Energy: ' + e.energyConsumptionKWh + 'kWh | Efficiency: ' + e.productionEfficiency + '%');
}

window.Terminal = Terminal;