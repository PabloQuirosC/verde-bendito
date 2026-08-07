import { useEffect, useRef, useState } from "react";

type MessageHandler = (data: any) => void;

function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function normalizeNotificationTopic(topic: string, token: string | null) {
  if (!topic.startsWith("mesero_") || !token) {
    return topic;
  }

  const payload = parseJwtPayload(token);
  const userId = Number(payload?.user_id);
  if (!Number.isFinite(userId) || userId <= 0) {
    return topic;
  }

  const canonicalTopic = `mesero_${userId}`;
  if (canonicalTopic !== topic) {
    console.debug("useNotifications: normalizando topic de mesero", {
      requestedTopic: topic,
      canonicalTopic,
      userId,
    });
  }

  return canonicalTopic;
}

// Buffer global para notificaciones recientes (últimas 50)
const notificationBuffer: any[] = [];
export function addToNotificationBuffer(payload: any) {
  notificationBuffer.push(payload);
  if (notificationBuffer.length > 50) {
    notificationBuffer.shift();
  }
}
export function getNotificationBuffer() {
  return [...notificationBuffer];
}
export function clearNotificationBuffer() {
  notificationBuffer.length = 0;
}

function buildWsUrl(topic: string) {
  const host = import.meta.env.VITE_API_WS_HOST || window.location.hostname;
  const port = import.meta.env.VITE_API_WS_PORT || "8000";
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const token = typeof window !== "undefined" ? sessionStorage.getItem("auth_token") : null;
  const normalizedTopic = normalizeNotificationTopic(topic, token);
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
  const url = `${protocol}://${host}:${port}/api/notifications/ws/${normalizedTopic}${tokenParam}`;
  console.debug("buildWsUrl:", { host, port, protocol, topic, normalizedTopic, url, hasToken: !!token });
  return url;
}

export function useNotifications(topic: string, onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number>(0);
  const onMessageRef = useRef<MessageHandler>(onMessage);
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let mounted = true;

    const connect = () => {
      const url = buildWsUrl(topic);
      console.debug("useNotifications: attempting connection to", url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.debug("useNotifications: connected to", {
          url: ws.url,
          readyState: ws.readyState,
          topic,
        });
        try {
          console.debug("useNotifications: onopen -> readyState", ws.readyState);
        } catch {}
        reconnectRef.current = 0;
        setStatus("open");
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          console.debug("📨 WebSocket message received:", data);
          
          // Llamar handler
          onMessageRef.current(data);
          
          // Disparar evento global y agregar al buffer
          if (data.payload) {
            // Agregar al buffer global
            addToNotificationBuffer(data.payload);
            
            window.dispatchEvent(
              new CustomEvent("vb:notification", {
                detail: data.payload
              })
            );
          }
        } catch (e) {
          console.error("Error procesando mensaje:", e);
        }
      };

      ws.onclose = (ev) => {
        console.debug("useNotifications: closed", {
          code: ev.code,
          reason: ev.reason,
          wasClean: ev.wasClean,
          readyState: ws.readyState,
        });
        try {
          console.debug("useNotifications: onclose details", { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
        } catch {}
        if (!mounted) return;
        setStatus("closed");
        // reconectar con backoff
        const timeout = Math.min(30000, 1000 * Math.pow(2, reconnectRef.current));
        reconnectRef.current += 1;
        console.debug(`useNotifications: reconnecting in ${timeout}ms (attempt ${reconnectRef.current})`);
        setTimeout(() => connect(), timeout);
      };

      ws.onerror = (err) => {
        if (ws.readyState === WebSocket.CLOSED) {
          console.debug("useNotifications: websocket closed before error event", {
            readyState: ws.readyState,
            url: ws.url,
          });
          return;
        }

        console.warn("useNotifications: websocket error", {
          type: "error",
          readyState: ws.readyState,
          url: ws.url,
          error: err,
        });
        try {
          console.debug("useNotifications: onerror ->", err);
        } catch {}
      };
    };

    connect();

    return () => {
      mounted = false;
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [topic]);

  return {
    status,
    send: (obj: any) => {
      try {
        wsRef.current?.send(JSON.stringify(obj));
      } catch (e) {
        console.error("useNotifications: send failed", e);
      }
    },
  };
}

export default useNotifications;
