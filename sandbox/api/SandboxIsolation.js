function SandboxIsolation() {
  this.mode = 'sandbox';
}

SandboxIsolation.prototype.setMode = function(mode) {
  this.mode = mode;
  state.set('simulation.mode', mode);
  EventBus.emit('state:mode:' + mode);
  this.showConfirmation(mode);
};

SandboxIsolation.prototype.showConfirmation = function(mode) {
  if (mode === 'live') {
    const confirmed = confirm('WARNING: LIVE MODE\n\nChanges will be pushed to the real FIWARE context broker.\nAre you sure you want to switch to LIVE mode?');
    if (!confirmed) {
      this.setMode('sandbox');
      return;
    }
    this.showLiveBanner();
  } else {
    this.hideLiveBanner();
  }
};

SandboxIsolation.prototype.showLiveBanner = function() {
  const banner = document.createElement('div');
  banner.id = 'live-mode-banner';
  banner.style.cssText = 'position:fixed;top:48px;left:0;right:0;background:#ff3040;color:#fff;text-align:center;padding:6px;font-family:monospace;font-size:11px;z-index:100;';
  banner.textContent = 'WARNING: LIVE MODE ACTIVE - Changes affect production system';
  document.body.appendChild(banner);
};

SandboxIsolation.prototype.hideLiveBanner = function() {
  const banner = document.getElementById('live-mode-banner');
  if (banner) banner.remove();
};

SandboxIsolation.prototype.toggle = function() {
  this.setMode(this.mode === 'sandbox' ? 'live' : 'sandbox');
};

window.sandboxIsolation = new SandboxIsolation();