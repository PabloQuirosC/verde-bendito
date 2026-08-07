import { useEffect } from "react";
import { useStore } from "@/store/useStore";

/**
 * Simulación de WebSocket: avanza órdenes pendientes/proceso/listas
 * cuando hay cocina activa o admin viendo. Sirve para mostrar el flujo
 * en vivo aunque sea demo.
 */
export function useLiveSimulator() {
  const orders = useStore((s) => s.orders);
  const setOrderStatus = useStore((s) => s.setOrderStatus);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      orders.forEach((o) => {
        const age = now - new Date(o.updatedAt).getTime();
        if (o.status === "pendiente" && age > 18000) {
          setOrderStatus(o.id, "proceso");
        } else if (o.status === "proceso" && age > 30000) {
          setOrderStatus(o.id, "listo");
        }
      });
    }, 4000);
    return () => clearInterval(id);
  }, [orders, setOrderStatus]);
}

/** Reproduce un beep corto sintético. */
export function playBeep() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.18);
  } catch {
    /* noop */
  }
}

/** Reproduce 4 beeps consecutivos para notificación de orden. */
export function playNotification() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    
    const playBeepAtTime = (startTime: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(ctx.destination);
      o.start(startTime);
      o.stop(startTime + 0.18);
    };

    // Reproducir 4 beeps con 200ms de intervalo
    const now = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      playBeepAtTime(now + i * 0.25);
    }
  } catch {
    /* noop */
  }
}

/** Reproduce 3 beeps agudos para notificación al mesero (orden lista). */
export function playWaiterNotification() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    
    const playBeepAtTime = (startTime: number, freq: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(ctx.destination);
      o.start(startTime);
      o.stop(startTime + 0.15);
    };

    // 3 beeps ascendentes (campana) para notificación del mesero
    const now = ctx.currentTime;
    playBeepAtTime(now, 1000);      // Do
    playBeepAtTime(now + 0.2, 1200); // Re
    playBeepAtTime(now + 0.4, 1400); // Mi
  } catch {
    /* noop */
  }
}
