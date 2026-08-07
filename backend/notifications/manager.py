from typing import Dict, Set
from fastapi import WebSocket
import json
from collections import deque


class WebSocketManager:
    def __init__(self):
        # topics -> set of WebSocket
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # simple in-memory history store: topic -> deque[dict]
        self.history: Dict[str, deque] = {}
        # max history per topic
        self._max_history = 200

    async def connect(self, websocket: WebSocket, topic: str):
        await websocket.accept()
        conns = self.active_connections.setdefault(topic, set())
        conns.add(websocket)
        print(f"[WS] Cliente conectado a topic '{topic}'. Total en este topic: {len(conns)}")

    def disconnect(self, websocket: WebSocket, topic: str):
        conns = self.active_connections.get(topic)
        if not conns:
            return
        conns.discard(websocket)
        if len(conns) == 0:
            self.active_connections.pop(topic, None)
        print(f"[WS] Cliente desconectado de topic '{topic}'. Total en este topic: {len(conns) if conns else 0}")

    async def send_personal(self, websocket: WebSocket, message: dict):
        await websocket.send_text(json.dumps(message))

    async def broadcast(self, topic: str, message: dict):
        conns = self.active_connections.get(topic, set()).copy()
        data = json.dumps(message)
        # store in history (best-effort, keep bounded)
        try:
            dq = self.history.setdefault(topic, deque(maxlen=self._max_history))
            dq.append(message)
            print(f"[WS] Mensaje guardado en historial de '{topic}'. Total en historial: {len(dq)}")
        except Exception as e:
            print(f"[WS] Error guardando en historial: {e}")
            pass
        for connection in conns:
            try:
                await connection.send_text(data)
            except Exception as e:
                print(f"[WS] Error enviando a conexión: {e}")
                # best effort: ignore failures
                pass
        print(f"[WS] Broadcast a '{topic}': {len(conns)} conexiones activas")

    def get_history(self, topic: str, limit: int = 50):
        dq = self.history.get(topic)
        if not dq:
            return []
        # return newest first
        items = list(dq)
        return items[-limit:][::-1]
    
    def get_all_topics(self):
        """Obtiene lista de todos los topics con conexiones activas."""
        return list(self.active_connections.keys())


# instancia global para usar desde otras rutas
manager = WebSocketManager()
