import { Bell, ChefHat } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useCallback, useState, useRef, useEffect } from "react";
import useNotifications from "@/hooks/useNotifications";

const seed: any[] = [];

export default function Notificaciones() {
  const [news, setNews] = useState(seed);

  // 🔊 audio + estado de permiso
  const [audio, setAudio] = useState<any | null>(null);
  const [enabled, setEnabled] = useState(() => {
    try {
      return sessionStorage.getItem("sound_unlocked") === "1";
    } catch {
      return false;
    }
  });
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (!audio) {
      const a = new Audio("/sounds/notify.mp3");
      a.volume = 1;
      a.preload = "auto";
      setAudio(a);
    }
  }, [enabled, audio]);

  // ✅ activar audio (OBLIGATORIO por navegadores)
  const enableAudio = async () => {
    const candidates = ["/sounds/notify.mp3", "/sounds/notify.wav"];

    // Intenta cada URL en orden hasta que una funcione
    for (const url of candidates) {
      try {
        const head = await fetch(url, { method: "HEAD" });
        if (!head.ok) {
          console.debug("Audio file not found (HEAD):", url, head.status);
          continue;
        }
      } catch (e) {
        console.debug("HEAD check failed for", url, e);
        continue;
      }

      const a = new Audio(url);
      a.volume = 1;
      a.preload = "auto";

      try {
        await a.play();
        a.pause();
        a.currentTime = 0;
        setAudio(a);
        setEnabled(true);
        console.log("✅ Audio desbloqueado:", url);
        return;
      } catch (e) {
        console.warn("No se pudo reproducir", url, "intentando siguiente opción:", e);
      }
    }

    // Si no hay archivos reproducibles, crear AudioContext como fallback
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        const ctx: AudioContext = new Ctx();
        if (ctx.state === "suspended") await ctx.resume();
        audioCtxRef.current = ctx;
        setEnabled(true);
        console.log("✅ AudioContext desbloqueado (fallback)");
      } else {
        alert("⚠️ El navegador no soporta AudioContext y no se pudo reproducir el sonido.");
      }
    } catch (e) {
      console.error("Error al crear AudioContext fallback:", e);
      alert("⚠️ No se pudo activar el sonido. Revisa la consola para más detalles.");
    }
  };

  const playBeep = (duration = 0.18, freq = 880) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.5, now + 0.01);
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      o.stop(now + duration + 0.02);
    } catch (e) {
      console.error("Error playBeep:", e);
    }
  };

  const handleMessage = useCallback(
    (msg: any) => {
      const payload = msg?.payload;
      if (!payload) return;

      const item = {
        icon: ChefHat,
        tone: "bg-success/15 text-success",
        title: payload.title || "Pedido listo",
        desc: payload.desc || `Mesa ${payload.mesa ?? "?"}`,
        t: "Ahora",
      };

      // 🔊 reproducir sonido (YA DESBLOQUEADO)
      if (audio && enabled) {
        try {
          audio.currentTime = 0;
          audio.play();
        } catch (e) {
          console.error("Error audio:", e);
        }
      } else if (enabled && audioCtxRef.current) {
        playBeep();
      }

      // 📳 vibración móvil
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      setNews((s) => [item, ...s].slice(0, 20));
    },
    [audio, enabled]
  );

  // usuario desde session
  let sessionUser: any = null;
  try {
    const saved = sessionStorage.getItem("auth_user");
    sessionUser = saved ? JSON.parse(saved) : null;
  } catch {
    sessionUser = null;
  }

  const topic =
    sessionUser && sessionUser.user_id
      ? `mesero_${sessionUser.user_id}`
      : "mesero_1";

  const { status } = useNotifications(topic, handleMessage) as any;

  return (
    <>
      <PageHeader
        title="Notificaciones"
        subtitle="Hoy"
        home
        right={<Bell className="h-5 w-5 text-muted-foreground" />}
      />

      {/* ✅ BOTÓN PARA DESBLOQUEAR AUDIO */}
      {!enabled && (
        <div className="px-4 mb-3">
          <button
            onClick={enableAudio}
            className="w-full bg-primary text-white rounded-xl p-3 text-sm"
          >
            🔔 Activar sonido de notificaciones
          </button>
        </div>
      )}

      <div className="px-4 pb-8 space-y-2">
        <div className="text-xs text-muted-foreground mb-2">
          Conexión: {status ?? "connecting"}
        </div>

        {news.map((n, i) => {
          const Icon = n.icon;
          return (
            <article
              key={i}
              className="rounded-2xl bg-card border border-border/60 shadow-soft p-3.5 flex items-start gap-3"
            >
              <div
                className={`grid h-10 w-10 place-items-center rounded-xl shrink-0 ${n.tone}`}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {n.desc}
                </p>
              </div>

              <span className="text-[10px] text-muted-foreground shrink-0">
                {n.t}
              </span>
            </article>
          );
        })}
      </div>
    </>
  );
}