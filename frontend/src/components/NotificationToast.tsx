import { toast } from "@/components/ui/sonner";
import { useEffect, useRef } from "react";

interface NotificationPayload {
  type?: string;
  title?: string;
  desc?: string;
  mesa?: string | number;
}

// Crear sonidos simples con Web Audio API
function playSound(type: "success" | "warning" | "info") {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Frecuencias diferentes por tipo
    const frequencies = {
      success: 800, // Más agudo para éxito
      warning: 600, // Medio para advertencia
      info: 400, // Más grave para info
    };

    const durations = {
      success: 0.3,
      warning: 0.4,
      info: 0.2,
    };

    oscillator.frequency.value = frequencies[type];
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + durations[type]);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + durations[type]);
  } catch (e) {
    console.debug("No se pudo reproducir sonido:", e);
  }
}

// Vibración del dispositivo
function vibrate(pattern: number | number[]) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    console.debug("Vibración no soportada:", e);
  }
}

export function showNotificationToast(payload: NotificationPayload) {
  const type = String(payload?.type || "").toLowerCase();
  const isPedidoListo =
    type === "pedido_listo" || String(payload?.title || "").toLowerCase().includes("listo");
  const isCocinaPending = type === "nuevo_item" || type === "item_en_proceso";

  if (isPedidoListo) {
    playSound("success");
    vibrate([100, 50, 100]); // Dos vibras cortas para éxito
    toast.success(payload?.title || "✅ Pedido listo", {
      description: payload?.desc || `Mesa ${payload?.mesa ?? "?"} · Puede retirarse en cocina`,
      duration: 5000,
    });
  } else if (isCocinaPending) {
    playSound("warning");
    vibrate([200, 100, 200]); // Vibra más larga para advertencia
    toast.warning(payload?.title || "🍳 Nuevo pedido en cocina", {
      description: payload?.desc || `Mesa ${payload?.mesa ?? "?"} · Pendiente de preparar`,
      duration: 4000,
    });
  } else {
    playSound("info");
    vibrate(100); // Vibra simple
    toast(payload?.title || "📬 Notificación", {
      description: payload?.desc || `Mesa ${payload?.mesa ?? "?"}`,
      duration: 3000,
    });
  }
}

export function useNotificationListener() {
  useEffect(() => {
    const handleNotification = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      if (payload) {
        showNotificationToast(payload);
      }
    };

    window.addEventListener("vb:notification", handleNotification as EventListener);
    return () => window.removeEventListener("vb:notification", handleNotification as EventListener);
  }, []);
}
