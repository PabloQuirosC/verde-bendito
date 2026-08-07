// Simple beep alert using WebAudio. Plays a loud 2-tone alarm for `seconds` seconds.
let activeCtx: AudioContext | null = null;
let stopAt = 0;

export function playAlert(seconds = 6) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (activeCtx) {
      stopAt = performance.now() + seconds * 1000;
      return;
    }
    const ctx = new Ctx();
    // Intentar reanudar contexto por si está suspendido (requiere gesto previo)
    if (ctx.state === "suspended") {
      try {
        // @ts-ignore
        ctx.resume();
      } catch {}
    }
    activeCtx = ctx;
    stopAt = performance.now() + seconds * 1000;

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    // ramp up quickly to avoid pops
    master.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 0.05);

    let toneIdx = 0;
    const tones = [880, 660]; // alarm pattern

    const tick = () => {
      if (!activeCtx) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = tones[toneIdx % tones.length];
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.32);
      osc.connect(g).connect(master);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
      toneIdx++;
      if (performance.now() < stopAt) {
        setTimeout(tick, 380);
      } else {
        master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
        setTimeout(() => { ctx.close(); activeCtx = null; }, 200);
      }
    };
    tick();
  } catch {
    /* ignore */
  }
}

export function stopAlert() {
  stopAt = 0;
}

export async function   unlockSound(): Promise<boolean> {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    // crear un pequeño buffer silencioso para asegurarnos de desbloqueo
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    setTimeout(() => {
      try { ctx.close(); } catch {}
    }, 50);
    // marcar en sessionStorage para UI
    try { sessionStorage.setItem("sound_unlocked", "1"); } catch {}
    return true;
  } catch (e) {
    return false;
  }
}
