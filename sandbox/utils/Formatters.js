function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function formatDuration(hours) {
  if (hours < 1) return Math.round(hours * 60) + ' min';
  return hours.toFixed(1) + ' h';
}

function formatDistance(meters) {
  if (meters >= 1000) return (meters / 1000).toFixed(2) + ' km';
  return Math.round(meters) + ' m';
}

function formatEnergy(kwh) {
  return kwh.toFixed(2) + ' kWh';
}

function formatPercent(value) {
  return value.toFixed(1) + '%';
}

window.formatTime = formatTime;
window.formatDuration = formatDuration;
window.formatDistance = formatDistance;
window.formatEnergy = formatEnergy;
window.formatPercent = formatPercent;