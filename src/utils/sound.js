// Beep corto sintetizado con Web Audio API — sin archivo de audio ni CDN externo.
let _ctx = null;

export function playNotificationSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!_ctx) _ctx = new Ctx();
    if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});

    const now = _ctx.currentTime;
    [0, 0.15].forEach((delay, i) => {
      const osc  = _ctx.createOscillator();
      const gain = _ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 880 : 1046, now + delay);
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.2, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.2);
      osc.connect(gain);
      gain.connect(_ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.22);
    });
  } catch {
    // Web Audio no disponible o bloqueada — no es crítico, se omite en silencio
  }
}
