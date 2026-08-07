from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from database.dependencies import get_db_app_comandas
from sqlalchemy.orm import Session
from models.auditoria import Auditoria
from repository.usuario.usuario_repository import get_usuario_by_id
import json


TYPE_LABELS = {
    "middleware": "Acceso",
    "compra": "Compras",
    "compras": "Compras",
    "usuario": "Usuarios",
    "usuarios": "Usuarios",
    "producto": "Productos",
    "productos": "Productos",
    "factura": "Facturas",
    "facturas": "Facturas",
    "inventario": "Inventario",
    "pago": "Cobro",
    "pagos": "Cobro",
    "comanda": "Comanda",
    "comandas": "Comanda",
}


def _label_type(value: str | None) -> str:
    if not value:
        return ""
    key = value.strip().lower()
    return TYPE_LABELS.get(key, value.strip().capitalize())


def _format_payload_summary(payload: object) -> str:
    if not isinstance(payload, dict) or not payload:
        return ""

    ordered_keys = (
        "numero",
        "nombre",
        "proveedor_nombre",
        "usuario_nombre",
        "producto_nombre",
        "mesa_nombre",
        "total",
        "subtotal",
        "estado",
        "compra_id",
        "comanda_id",
        "factura_id",
        "id",
    )
    parts = []
    for key in ordered_keys:
        value = payload.get(key)
        if value not in (None, ""):
            parts.append(f"{key}: {value}")

    if parts:
        return " · ".join(parts)

    for key, value in list(payload.items())[:5]:
        if value not in (None, ""):
            parts.append(f"{key}: {value}")
    return " · ".join(parts)


def _format_detail(r: Auditoria) -> str:
    """Construir un resumen legible usando datos_antes/datos_despues/accion."""
    try:
        # Si es un log de middleware, no mostrar detalles sensibles
        if (r.modulo and r.modulo.lower() == "middleware") or (r.accion and r.accion.upper() in ("REQUEST", "REQUEST_ERROR")):
            after = r.datos_despues or {}
            status = after.get("status") if isinstance(after, dict) else None
            err = after.get("error_type") if isinstance(after, dict) else None
            if err:
                return f"Acceso a API · estado: {status or 'desconocido'} · error: {err}"
            return f"Acceso a API · estado: {status or 'desconocido'}"

        accion = (r.accion or "").upper()
        modulo = (r.modulo or "").lower()
        antes = r.datos_antes or {}
        despues = r.datos_despues or {}

        if modulo in ("compra", "compras") or "COMPRA" in accion:
            origen = antes if isinstance(antes, dict) and antes else despues if isinstance(despues, dict) else {}
            resumen = _format_payload_summary(origen) or (f"id: {r.registro_id}" if r.registro_id is not None else "")
            if accion.startswith("ELIMINAR"):
                return f"Compra eliminada{(' · ' + resumen) if resumen else ''}"
            if accion.startswith("CREAR"):
                return f"Compra creada{(' · ' + resumen) if resumen else ''}"
            if accion.startswith("ACTUALIZAR"):
                return f"Compra actualizada{(' · ' + resumen) if resumen else ''}"

        # Si ambos son dicts, mostrar diferencias
        if isinstance(antes, dict) and isinstance(despues, dict) and antes and despues:
            diffs = []
            keys = set(list(antes.keys()) + list(despues.keys()))
            for k in keys:
                a = antes.get(k)
                b = despues.get(k)
                if a != b:
                    diffs.append(f"{k}: {a} → {b}")
            if diffs:
                return "; ".join(diffs)
        # Si sólo hay datos_despues, resumirlos
        if isinstance(despues, dict) and despues:
            parts = []
            for k, v in list(despues.items())[:5]:
                parts.append(f"{k}: {v}")
            return ", ".join(parts)
        # fallback: stringify datos_despues or accion
        if r.datos_despues:
            return json.dumps(r.datos_despues, ensure_ascii=False)
        if r.accion:
            return r.accion
    except Exception:
        pass
    return ""


def _resolve_user_name(r: Auditoria, db: Session) -> str:
    if r.nombre_usuario:
        return r.nombre_usuario
    usuario_rel = getattr(r, "usuario", None)
    if usuario_rel is not None:
        full_name = " ".join(filter(None, [getattr(usuario_rel, "nombre", None), getattr(usuario_rel, "apellido", None)])).strip()
        return full_name or getattr(usuario_rel, "nombre_usuario", "") or ""
    if r.usuario_id:
        usuario = get_usuario_by_id(db, r.usuario_id)
        if usuario:
            full_name = " ".join(filter(None, [getattr(usuario, "nombre", None), getattr(usuario, "apellido", None)])).strip()
            return full_name or getattr(usuario, "nombre_usuario", "") or ""
    return ""

router = APIRouter()


@router.get("/types")
def get_auditoria_types(db: Session = Depends(get_db_app_comandas)):
    """Devuelve los tipos/módulos únicos presentes en la bitácora para poblar filtros dinámicos."""
    rows = db.query(Auditoria).order_by(Auditoria.fecha_accion.desc()).limit(2000).all()
    types = set()
    for r in rows:
        if r.modulo:
            types.add(_label_type(r.modulo))
        elif r.accion:
            types.add(_label_type(r.accion))
    # garantizar orden predecible
    return {"types": sorted(list(types))}


@router.get("/")
def list_auditoria(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    modulo: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db_app_comandas),
):
    query = db.query(Auditoria).order_by(Auditoria.fecha_accion.desc())
    if modulo:
        query = query.filter(Auditoria.modulo == modulo)

    rows = query.all()
    if q:
        needle = q.strip().lower()

        def matches(row: Auditoria) -> bool:
            haystack_parts = [
                row.nombre_usuario or "",
                row.accion or "",
                row.modulo or "",
                row.tabla_afectada or "",
                _format_detail(row),
                json.dumps(row.datos_antes, ensure_ascii=False) if row.datos_antes is not None else "",
                json.dumps(row.datos_despues, ensure_ascii=False) if row.datos_despues is not None else "",
            ]
            haystack = " ".join(haystack_parts).lower()
            return needle in haystack

        rows = [row for row in rows if matches(row)]

    total = len(rows)
    rows = rows[skip: skip + limit]

    items = []
    for r in rows:
        # derive simple fields for frontend
        ts = r.fecha_accion.strftime("%H:%M") if r.fecha_accion else "00:00"
        # Avoid exposing internal module name 'middleware' — present a generic type
        if r.modulo and r.modulo.lower() == "middleware":
            tipo = "Acceso"
        else:
            tipo = _label_type(r.modulo) or _label_type(r.accion) or ""

        detail = _format_detail(r) or r.accion or ""
        user = _resolve_user_name(r, db)
        device = r.dispositivo or ""
        browser = r.navegador or ""
        ip = r.ip_usuario or ""
        # severity heuristic
        severity = "info"
        if r.accion and any(k in r.accion.lower() for k in ("error", "fail", "rejected")):
            severity = "critical"
        elif r.accion and any(k in r.accion.lower() for k in ("warn", "warning")):
            severity = "warning"

        items.append({
            "id": str(r.id),
            "usuario_id": r.usuario_id,
            "date": r.fecha_accion.isoformat() if r.fecha_accion else None,
            "ts": ts,
            "type": tipo,
            "detail": str(detail) if detail is not None else "",
            "user": user,
            "device": device,
            "navegador": browser,
            "ip_usuario": ip,
            # Sanitize before/after for middleware logs: remove paths/methods
            "before": (None if (r.modulo and r.modulo.lower() == "middleware") else r.datos_antes),
            "after": (None if (r.modulo and r.modulo.lower() == "middleware") else r.datos_despues) if not (r.modulo and r.modulo.lower() == "middleware") else ({"status": (r.datos_despues or {}).get("status") if isinstance((r.datos_despues or {}), dict) else None, "error_type": (r.datos_despues or {}).get("error_type") if isinstance((r.datos_despues or {}), dict) else None}),
            "severity": severity,
        })

    return {"total": total, "items": items}
