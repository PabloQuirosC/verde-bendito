from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Body, Depends
from typing import Dict
from notifications.manager import manager
from jose import jwt, JWTError
import os
import logging
from utils.utils import validate_token

logger = logging.getLogger(__name__)

# JWT config (same env vars as dependencies)
JWT_SECRET = os.getenv("SECRET_KEY")
JWT_ALGORITHM = os.getenv("ALGORITHM", "HS256")

router = APIRouter()


@router.websocket("/ws/{topic}")
async def websocket_endpoint(websocket: WebSocket, topic: str):
    client_addr = f"{websocket.client.host}:{websocket.client.port}" if websocket.client else "unknown"
    logger.info(f"[WS] Intento de conexión: topic={topic}, client={client_addr}")
    
    # Accept token via query param (browsers cannot set custom WS headers)
    token = websocket.query_params.get("token")
    user_id = None
    
    if token and JWT_SECRET:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("user_id")
            logger.info(f"[WS] Token válido, user_id={user_id}")
        except JWTError as e:
            logger.warning(f"[WS] Token inválido: {e}")
            user_id = None
    else:
        logger.warning(f"[WS] Sin token o sin JWT_SECRET configurado")

    # If the client asks for a waiter topic, bind it to the authenticated user.
    if user_id and topic.startswith("mesero_"):
        old_topic = topic
        topic = f"mesero_{user_id}"
        logger.info(f"[WS] Topic reescrito: {old_topic} → {topic}")

    try:
        await manager.connect(websocket, topic)
        logger.info(f"[WS] ✅ Conexión aceptada: topic={topic}, client={client_addr}")
        
        try:
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    raise WebSocketDisconnect()
        except WebSocketDisconnect:
            manager.disconnect(websocket, topic)
            logger.info(f"[WS] Desconectado: topic={topic}")
    except Exception as e:
        logger.error(f"[WS] ❌ Error: {e}", exc_info=True)
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass


@router.post("/publish", dependencies=[Depends(validate_token)])
async def publish(message: Dict = Body(...)):
    """Publish a message to a topic.

    Body example: {"topic": "mesero_5", "payload": {"type":"pedido_listo","comanda_id":105, "mesa":9}}
    """
    topic = message.get("topic")
    payload = message.get("payload")
    if not topic or payload is None:
        return {"ok": False, "detail": "topic and payload required"}
    # store and broadcast
    await manager.broadcast(topic, {"topic": topic, "payload": payload})
    return {"ok": True}


@router.get("/health")
async def health():
    """Health check para notifications."""
    return {"ok": True, "message": "Notifications router is working"}


@router.get("/history/{topic}", dependencies=[Depends(validate_token)])
async def history(topic: str, limit: int = 50):
    """Get recent notifications for a topic. Returns newest first."""
    print(f"[HISTORY] Request para topic: {topic}")
    items = manager.get_history(topic, limit=limit)
    print(f"[HISTORY] Items encontrados: {len(items)}")
    print(f"[HISTORY] All topics: {manager.get_all_topics()}")
    return {"ok": True, "topic": topic, "items": items}


@router.get("/debug/topics", dependencies=[Depends(validate_token)])
async def debug_topics():
    """Debug endpoint para ver todos los topics con conexiones."""
    topics = manager.get_all_topics()
    histories = {}
    for topic in topics:
        history = manager.get_history(topic, limit=10)
        histories[topic] = len(history)
    return {
        "active_topics": topics,
        "histories": histories
    }


@router.post("/test/{topic}", dependencies=[Depends(validate_token)])
async def test_notification(topic: str):
    """Endpoint de prueba para generar notificaciones de ejemplo."""
    test_messages = [
        {
            "type": "pedido_listo",
            "title": "✅ Pedido listo",
            "desc": "Mesa 5 · Puede retirarse en cocina",
            "mesa": 5
        },
        {
            "type": "nuevo_item",
            "title": "🍳 Nuevo pedido en cocina",
            "desc": "Mesa 3 · Pendiente de preparar",
            "mesa": 3
        },
        {
            "type": "item_en_proceso",
            "title": "🍳 Pedido en proceso",
            "desc": "Mesa 7 · Preparando...",
            "mesa": 7
        }
    ]
    
    # Enviar múltiples notificaciones de prueba
    for msg in test_messages:
        await manager.broadcast(topic, {"topic": topic, "payload": msg})
    
    return {"ok": True, "sent": len(test_messages), "topic": topic}
