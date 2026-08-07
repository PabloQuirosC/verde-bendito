from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import List

from repository.proveedor import ProveedorRepository
from schemas.operaciones_schemas import ProveedorCreate, ProveedorUpdate, ProveedorResponse


repo = ProveedorRepository


def _dump_model(model):
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def _dump_model_exclude_unset(model):
    if hasattr(model, "model_dump"):
        return model.model_dump(exclude_unset=True)
    return model.dict(exclude_unset=True)


def _orm_to_dict(value):
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if hasattr(value, "dict"):
        try:
            return value.dict()
        except Exception:
            pass
    if hasattr(value, "__dict__"):
        return {
            key: val
            for key, val in value.__dict__.items()
            if not key.startswith("_sa_") and key != "_sa_instance_state"
        }
    return value


def _validate_response(schema, value):
    if hasattr(schema, "model_validate"):
        try:
            return schema.model_validate(value)
        except Exception:
            return schema.model_validate(_orm_to_dict(value))

    data = _orm_to_dict(value)
    if hasattr(schema, "parse_obj"):
        try:
            return schema.parse_obj(value)
        except Exception:
            return schema.parse_obj(data)
    return schema(**data)


def create_proveedor(db: Session, proveedor_data: ProveedorCreate) -> ProveedorResponse:
    existing = ProveedorRepository(db).get_by_nombre(proveedor_data.nombre)
    if existing:
        raise HTTPException(status_code=400, detail=f"El proveedor '{proveedor_data.nombre}' ya existe")

    create_data = _dump_model(proveedor_data)
    proveedor = ProveedorRepository(db).create(create_data)
    if not proveedor:
        raise HTTPException(status_code=500, detail="Error al crear proveedor")
    return _validate_response(ProveedorResponse, proveedor)


def get_proveedor(db: Session, proveedor_id: int) -> ProveedorResponse:
    proveedor = ProveedorRepository(db).get_by_id(proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return _validate_response(ProveedorResponse, proveedor)


def get_all_proveedores(db: Session, skip: int = 0, limit: int = 100) -> List[ProveedorResponse]:
    proveedores = ProveedorRepository(db).get_all(skip, limit)
    return [_validate_response(ProveedorResponse, item) for item in proveedores]


def update_proveedor(db: Session, proveedor_id: int, proveedor_data: ProveedorUpdate) -> ProveedorResponse:
    proveedor = ProveedorRepository(db).get_by_id(proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    if proveedor_data.nombre:
        existing = ProveedorRepository(db).get_by_nombre(proveedor_data.nombre)
        if existing and existing.id != proveedor_id:
            raise HTTPException(status_code=400, detail=f"El proveedor '{proveedor_data.nombre}' ya existe")

    update_data = _dump_model_exclude_unset(proveedor_data)
    updated = ProveedorRepository(db).update(proveedor_id, update_data)
    if not updated:
        raise HTTPException(status_code=500, detail="Error al actualizar proveedor")
    return _validate_response(ProveedorResponse, updated)


def delete_proveedor(db: Session, proveedor_id: int) -> dict:
    proveedor = ProveedorRepository(db).get_by_id(proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    if not ProveedorRepository(db).delete(proveedor_id):
        raise HTTPException(status_code=500, detail="Error al eliminar proveedor")
    return {"message": "Proveedor eliminado exitosamente"}
