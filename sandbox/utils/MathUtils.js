function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function() {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, arguments);
    }
  };
}

function debounce(fn, delay) {
  let timer;
  return function() {
    const _this = this;
    clearTimeout(timer);
    timer = setTimeout(function() { fn.apply(_this, arguments); }, delay);
  };
}

window.clamp = clamp;
window.lerp = lerp;
window.mapRange = mapRange;
window.throttle = throttle;
window.debounce = debounce;