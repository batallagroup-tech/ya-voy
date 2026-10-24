export const hapticLight  = () => { try { navigator.vibrate?.(15) } catch {} }
export const hapticMedium = () => { try { navigator.vibrate?.(40) } catch {} }
export const hapticSuccess = () => { try { navigator.vibrate?.([10, 40, 10]) } catch {} }
export const hapticError  = () => { try { navigator.vibrate?.([30, 20, 30]) } catch {} }

// Sonido háptico de satisfacción ("Cha-ching" de compra confirmada)
export const playPurchaseChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      hapticSuccess();
      return;
    }
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.28, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };

    // Doble campana brillante (cha-ching)
    playTone(987.77, now, 0.35);         // B5
    playTone(1318.51, now + 0.08, 0.55); // E6
    hapticSuccess();
  } catch {
    hapticSuccess();
  }
};
