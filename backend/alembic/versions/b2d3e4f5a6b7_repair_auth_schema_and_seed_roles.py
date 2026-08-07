"""Repair auth schema and seed roles/permissions

Revision ID: b2d3c4e5f6
Revises: a1c2e3f4b5d6
Create Date: 2026-05-15 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "b2d3c4e5f6"
down_revision: Union[str, Sequence[str], None] = "a1c2e3f4b5d6"
branch_labels = None
depends_on = None


ROLES = [
    ("Administrador", "Usuario con acceso total al sistema"),
    ("Gerente", "Acceso a reportes y configuracion"),
    ("Mesero", "Acceso a tomar comandas"),
    ("Cocinero", "Acceso a ver comandas en cocina"),
]


PERMISOS = [
    ("acceder_comandas", "comandas", "Acceder al modulo de comandas"),
    ("ver_comandas", "comandas", "Ver comandas"),
    ("crear_comanda", "comandas", "Crear comandas"),
    ("editar_comanda", "comandas", "Editar comandas"),
    ("eliminar_comanda", "comandas", "Eliminar comandas"),
    ("acceder_mesas", "mesas", "Acceder al modulo de mesas"),
    ("ver_mesas", "mesas", "Ver mesas"),
    ("crear_mesa", "mesas", "Crear mesas"),
    ("editar_mesa", "mesas", "Editar mesas"),
    ("eliminar_mesa", "mesas", "Eliminar mesas"),
    ("acceder_productos", "productos", "Acceder al modulo de productos"),
    ("ver_productos", "productos", "Ver productos"),
    ("crear_producto", "productos", "Crear productos"),
    ("editar_producto", "productos", "Editar productos"),
    ("eliminar_producto", "productos", "Eliminar productos"),
    ("acceder_clientes", "clientes", "Acceder al modulo de clientes"),
    ("ver_clientes", "clientes", "Ver clientes"),
    ("crear_cliente", "clientes", "Crear clientes"),
    ("editar_cliente", "clientes", "Editar clientes"),
    ("eliminar_cliente", "clientes", "Eliminar clientes"),
    ("acceder_pagos", "pagos", "Acceder al modulo de pagos"),
    ("ver_pagos", "pagos", "Ver pagos"),
    ("crear_pago", "pagos", "Registrar pagos"),
    ("editar_pago", "pagos", "Editar pagos"),
    ("eliminar_pago", "pagos", "Eliminar pagos"),
    ("acceder_inventario", "inventario", "Acceder al modulo de inventario"),
    ("ver_inventario", "inventario", "Ver inventario"),
    ("gestionar_inventario", "inventario", "Gestionar inventario"),
    ("acceder_compras", "compras", "Acceder al modulo de compras"),
    ("ver_compras", "compras", "Ver compras"),
    ("crear_compra", "compras", "Crear compras"),
    ("acceder_facturas", "facturas", "Acceder al modulo de facturas"),
    ("ver_facturas", "facturas", "Ver facturas"),
    ("emitir_factura", "facturas", "Emitir facturas"),
    ("acceder_usuarios", "usuarios", "Acceder al modulo de usuarios"),
    ("ver_usuarios", "usuarios", "Ver usuarios"),
    ("crear_usuario", "usuarios", "Crear usuarios"),
    ("editar_usuario", "usuarios", "Editar usuarios"),
    ("eliminar_usuario", "usuarios", "Eliminar usuarios"),
    ("gestionar_roles", "usuarios", "Gestionar roles y permisos"),
    ("acceder_roles", "roles", "Acceder al modulo de roles"),
    ("ver_roles", "roles", "Ver roles"),
    ("crear_rol", "roles", "Crear roles"),
    ("editar_rol", "roles", "Editar roles"),
    ("eliminar_rol", "roles", "Eliminar roles"),
    ("acceder_permisos", "permisos", "Acceder al modulo de permisos"),
    ("ver_permisos", "permisos", "Ver permisos"),
    ("crear_permiso", "permisos", "Crear permisos"),
    ("editar_permiso", "permisos", "Editar permisos"),
    ("eliminar_permiso", "permisos", "Eliminar permisos"),
    ("acceder_reportes", "reportes", "Acceder al modulo de reportes"),
    ("ver_reportes", "reportes", "Ver reportes"),
    ("acceder_configuracion", "configuracion", "Acceder a configuracion del sistema"),
    ("editar_configuracion", "configuracion", "Editar configuracion"),
    ("acceder_cocina", "cocina", "Acceder al modulo de cocina"),
    ("ver_tablero_cocina", "cocina", "Ver tablero de cocina"),
    ("marcar_item_listo", "cocina", "Marcar items como listos"),
    ("ver_historial_cocina", "cocina", "Ver historial de cocina"),
]


def _safe_execute(conn, sql: str) -> None:
    try:
        conn.execute(text(sql))
    except Exception:
        pass


def upgrade() -> None:
    conn = op.get_bind()

    # Asegurar que las PKs sean auto-incrementales y que las tablas de relación tengan la forma correcta.
    _safe_execute(conn, "ALTER TABLE rol ADD PRIMARY KEY (id)")
    _safe_execute(conn, "ALTER TABLE rol MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT")

    _safe_execute(conn, "ALTER TABLE permiso ADD PRIMARY KEY (id)")
    _safe_execute(conn, "ALTER TABLE permiso MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT")

    cols_rol_permiso = [r[0].upper() for r in conn.execute(text("SHOW COLUMNS FROM rol_permiso")).fetchall()]
    if "ROLID" not in cols_rol_permiso:
        conn.execute(text("ALTER TABLE rol_permiso ADD COLUMN ROLID INT NOT NULL"))
    if "PERMISOID" not in cols_rol_permiso:
        conn.execute(text("ALTER TABLE rol_permiso ADD COLUMN PERMISOID INT NOT NULL"))
    _safe_execute(conn, "ALTER TABLE rol_permiso DROP PRIMARY KEY")
    _safe_execute(conn, "ALTER TABLE rol_permiso ADD PRIMARY KEY (ROLID, PERMISOID)")
    _safe_execute(
        conn,
        "ALTER TABLE rol_permiso ADD CONSTRAINT fk_rol_permiso_rol FOREIGN KEY (ROLID) REFERENCES rol(id) ON DELETE CASCADE",
    )
    _safe_execute(
        conn,
        "ALTER TABLE rol_permiso ADD CONSTRAINT fk_rol_permiso_permiso FOREIGN KEY (PERMISOID) REFERENCES permiso(id) ON DELETE CASCADE",
    )

    cols_usuario_rol = [r[0].upper() for r in conn.execute(text("SHOW COLUMNS FROM usuario_rol")).fetchall()]
    if "USUARIOID" not in cols_usuario_rol:
        conn.execute(text("ALTER TABLE usuario_rol ADD COLUMN USUARIOID INT NOT NULL"))
    if "ROLID" not in cols_usuario_rol:
        conn.execute(text("ALTER TABLE usuario_rol ADD COLUMN ROLID INT NOT NULL"))
    _safe_execute(conn, "ALTER TABLE usuario_rol DROP PRIMARY KEY")
    _safe_execute(conn, "ALTER TABLE usuario_rol ADD PRIMARY KEY (USUARIOID, ROLID)")
    _safe_execute(
        conn,
        "ALTER TABLE usuario_rol ADD CONSTRAINT fk_usuario_rol_usuario FOREIGN KEY (USUARIOID) REFERENCES usuario(id) ON DELETE CASCADE",
    )
    _safe_execute(
        conn,
        "ALTER TABLE usuario_rol ADD CONSTRAINT fk_usuario_rol_rol FOREIGN KEY (ROLID) REFERENCES rol(id) ON DELETE CASCADE",
    )

    # Seed base: roles.
    for nombre, descripcion in ROLES:
        conn.execute(
            text(
                "INSERT INTO rol (nombrerol, descripcion) "
                "SELECT :nombre, :descripcion FROM DUAL "
                "WHERE NOT EXISTS (SELECT 1 FROM rol WHERE LOWER(nombrerol) = LOWER(:nombre))"
            ),
            {"nombre": nombre, "descripcion": descripcion},
        )

    # Seed base: permisos.
    for nombre, modulo, descripcion in PERMISOS:
        conn.execute(
            text(
                "INSERT INTO permiso (nombrepermiso, modulo, descripcion) "
                "SELECT :nombre, :modulo, :descripcion FROM DUAL "
                "WHERE NOT EXISTS (SELECT 1 FROM permiso WHERE LOWER(nombrepermiso) = LOWER(:nombre))"
            ),
            {"nombre": nombre, "modulo": modulo, "descripcion": descripcion},
        )

    # Relaciones rol_permiso.
    admin_id = conn.execute(text("SELECT id FROM rol WHERE LOWER(nombrerol) = 'administrador' LIMIT 1")).scalar()
    cocinero_id = conn.execute(text("SELECT id FROM rol WHERE LOWER(nombrerol) = 'cocinero' LIMIT 1")).scalar()

    if admin_id:
        permiso_ids = conn.execute(text("SELECT id FROM permiso")).fetchall()
        for (permiso_id,) in permiso_ids:
            conn.execute(
                text(
                    "INSERT INTO rol_permiso (ROLID, PERMISOID) "
                    "SELECT :rol_id, :permiso_id FROM DUAL "
                    "WHERE NOT EXISTS ("
                    "SELECT 1 FROM rol_permiso WHERE ROLID = :rol_id AND PERMISOID = :permiso_id"
                    ")"
                ),
                {"rol_id": admin_id, "permiso_id": permiso_id},
            )

    if cocinero_id:
        for permiso_nombre in ("acceder_cocina", "ver_tablero_cocina", "marcar_item_listo", "ver_historial_cocina"):
            permiso_id = conn.execute(
                text("SELECT id FROM permiso WHERE LOWER(nombrepermiso) = LOWER(:nombre) LIMIT 1"),
                {"nombre": permiso_nombre},
            ).scalar()
            if permiso_id:
                conn.execute(
                    text(
                        "INSERT INTO rol_permiso (ROLID, PERMISOID) "
                        "SELECT :rol_id, :permiso_id FROM DUAL "
                        "WHERE NOT EXISTS ("
                        "SELECT 1 FROM rol_permiso WHERE ROLID = :rol_id AND PERMISOID = :permiso_id"
                        ")"
                    ),
                    {"rol_id": cocinero_id, "permiso_id": permiso_id},
                )

    # Relacion base para el usuario admin.
    admin_user_id = conn.execute(
        text("SELECT id FROM usuario WHERE nombreusuario = 'admin' LIMIT 1")
    ).scalar()
    if admin_user_id and admin_id:
        conn.execute(
            text(
                "INSERT INTO usuario_rol (USUARIOID, ROLID) "
                "SELECT :usuario_id, :rol_id FROM DUAL "
                "WHERE NOT EXISTS ("
                "SELECT 1 FROM usuario_rol WHERE USUARIOID = :usuario_id AND ROLID = :rol_id"
                ")"
            ),
            {"usuario_id": admin_user_id, "rol_id": admin_id},
        )


def downgrade() -> None:
    conn = op.get_bind()

    admin_user_id = conn.execute(
        text("SELECT id FROM usuario WHERE nombreusuario = 'admin' LIMIT 1")
    ).scalar()
    admin_role_id = conn.execute(
        text("SELECT id FROM rol WHERE LOWER(nombrerol) = 'administrador' LIMIT 1")
    ).scalar()
    if admin_user_id and admin_role_id:
        conn.execute(
            text("DELETE FROM usuario_rol WHERE USUARIOID = :usuario_id AND ROLID = :rol_id"),
            {"usuario_id": admin_user_id, "rol_id": admin_role_id},
        )

    conn.execute(
        text(
            "DELETE rp FROM rol_permiso rp "
            "JOIN permiso p ON p.id = rp.PERMISOID "
            "WHERE LOWER(p.nombrepermiso) IN ("
            "'acceder_comandas','ver_comandas','crear_comanda','editar_comanda','eliminar_comanda',"
            "'acceder_mesas','ver_mesas','crear_mesa','editar_mesa','eliminar_mesa',"
            "'acceder_productos','ver_productos','crear_producto','editar_producto','eliminar_producto',"
            "'acceder_clientes','ver_clientes','crear_cliente','editar_cliente','eliminar_cliente',"
            "'acceder_pagos','ver_pagos','crear_pago','editar_pago','eliminar_pago',"
            "'acceder_inventario','ver_inventario','gestionar_inventario',"
            "'acceder_compras','ver_compras','crear_compra',"
            "'acceder_facturas','ver_facturas','emitir_factura',"
            "'acceder_usuarios','ver_usuarios','crear_usuario','editar_usuario','eliminar_usuario','gestionar_roles',"
            "'acceder_roles','ver_roles','crear_rol','editar_rol','eliminar_rol',"
            "'acceder_permisos','ver_permisos','crear_permiso','editar_permiso','eliminar_permiso',"
            "'acceder_reportes','ver_reportes',"
            "'acceder_configuracion','editar_configuracion',"
            "'acceder_cocina','ver_tablero_cocina','marcar_item_listo','ver_historial_cocina'"
            ")"
        )
    )
    conn.execute(
        text(
            "DELETE FROM permiso WHERE LOWER(nombrepermiso) IN ("
            "'acceder_comandas','ver_comandas','crear_comanda','editar_comanda','eliminar_comanda',"
            "'acceder_mesas','ver_mesas','crear_mesa','editar_mesa','eliminar_mesa',"
            "'acceder_productos','ver_productos','crear_producto','editar_producto','eliminar_producto',"
            "'acceder_clientes','ver_clientes','crear_cliente','editar_cliente','eliminar_cliente',"
            "'acceder_pagos','ver_pagos','crear_pago','editar_pago','eliminar_pago',"
            "'acceder_inventario','ver_inventario','gestionar_inventario',"
            "'acceder_compras','ver_compras','crear_compra',"
            "'acceder_facturas','ver_facturas','emitir_factura',"
            "'acceder_usuarios','ver_usuarios','crear_usuario','editar_usuario','eliminar_usuario','gestionar_roles',"
            "'acceder_roles','ver_roles','crear_rol','editar_rol','eliminar_rol',"
            "'acceder_permisos','ver_permisos','crear_permiso','editar_permiso','eliminar_permiso',"
            "'acceder_reportes','ver_reportes',"
            "'acceder_configuracion','editar_configuracion',"
            "'acceder_cocina','ver_tablero_cocina','marcar_item_listo','ver_historial_cocina'"
            ")"
        )
    )
    conn.execute(text("DELETE FROM rol WHERE LOWER(nombrerol) IN ('administrador','gerente','mesero','cocinero')"))
