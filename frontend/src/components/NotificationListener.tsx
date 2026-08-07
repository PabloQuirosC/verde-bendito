import { useEffect, useCallback, useMemo } from "react";
import { useSession } from "@/context/session";
import { playAlert } from "@/lib/sound";
import useNotifications from "@/hooks/useNotifications";
import { decodeJwtPayload, normalizeRolesFromToken } from "@/lib/jwt";

/** Global notification listener: subscribes via WebSocket and fires toasts/events. */
export function NotificationListener() {
  const { role } = useSession();

  const topics = useMemo(() => {
    const nextTopics = new Set<string>();

    try {
      const token = sessionStorage.getItem("auth_token");
      const payload = token ? decodeJwtPayload(token) : null;
      const tokenRoles = normalizeRolesFromToken(payload?.roles);
      const currentUserId = Number(payload?.user_id) || null;
      const normalizedRole = String(role || tokenRoles[0] || "").toLowerCase();

      if (normalizedRole.includes("cocina") || normalizedRole.includes("cocinero") || normalizedRole.includes("chef")) {
        nextTopics.add("cocina");
      }

      if (normalizedRole.includes("caja") || normalizedRole.includes("cajero")) {
        nextTopics.add("caja");
      }

      if (currentUserId) {
        nextTopics.add(`mesero_${currentUserId}`);
      }

      if (normalizedRole.includes("mesero") && !currentUserId) {
        nextTopics.add("mesero_1");
      }

      if (nextTopics.size === 0) {
        nextTopics.add("mesero_1");
      }
    } catch {
      nextTopics.add("mesero_1");
    }

    return Array.from(nextTopics);
  }, [role]);

  useEffect(() => {
    try {
      console.debug("NotificationListener topics:", topics);
    } catch {}
  }, [topics]);

  // Determinar topic principal según rol
  let topic = topics[0] ?? "mesero_1";

  const handleWs = useCallback((msg: any) => {
    const payload = msg?.payload || msg;
    if (!payload) return;
    try {
      console.debug("NotificationListener received payload:", payload);
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent("vb:notification", { detail: payload }));
    } catch (e) {
      console.warn("Error dispatching vb:notification", e);
    }

    // Pedido listo
    if (payload.type === "pedido_listo" || (payload.title && String(payload.title).toLowerCase().includes("listo"))) {
      try {
        playAlert(6);
      } catch {}

      // dispatch legacy event for compatibility
      try {
        const detail = { id: payload.comanda_id || payload.comandaId || null, table: payload.mesa || null, raw: payload };
        window.dispatchEvent(new CustomEvent("vb:order-ready", { detail }));
      } catch (e) {
        console.warn("Error dispatching vb:order-ready from global listener", e);
      }
    }

    // Cocina: sonar cuando llega un nuevo item/pedido pendiente
    if (payload.type === "nuevo_item") {
      try {
        playAlert(4);
      } catch {}
    }

    // Factura pendiente (para caja)
    if (payload.type === "factura_pendiente") {
      // Sin sonido: caja solo recibe el aviso visual en su panel.
    }
  }, []);

  function TopicSubscription({ topicName }: { topicName: string }) {
    useNotifications(topicName, handleWs);
    return null;
  }

  return (
    <>
      {topics.map((topicName) => (
        <TopicSubscription key={topicName} topicName={topicName} />
      ))}
    </>
  );
}
