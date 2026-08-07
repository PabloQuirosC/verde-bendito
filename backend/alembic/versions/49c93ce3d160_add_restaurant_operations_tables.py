"""Add restaurant operations tables

Revision ID: 49c93ce3d160
Revises: 48c93ce3d159
Create Date: 2026-04-22 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49c93ce3d160'
down_revision: Union[str, Sequence[str], None] = '48c93ce3d159'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add all restaurant operations tables."""
    
    # 1. CONFIGURACION (sin dependencias)
    op.create_table('configuracion',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('nombre_negocio', sa.String(200), nullable=False),
        sa.Column('ruc', sa.String(50), nullable=True),
        sa.Column('direccion', sa.Text(), nullable=True),
        sa.Column('ciudad', sa.String(100), nullable=True),
        sa.Column('pais', sa.String(100), nullable=True),
        sa.Column('telefono', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('sitio_web', sa.String(255), nullable=True),
        sa.Column('moneda', sa.String(3), nullable=False, server_default='USD'),
        sa.Column('idioma', sa.String(2), nullable=False, server_default='es'),
        sa.Column('impuesto', sa.Numeric(5, 2), nullable=False, server_default='13'),
        sa.Column('horario_apertura', sa.Time(), nullable=True),
        sa.Column('horario_cierre', sa.Time(), nullable=True),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('activo', sa.Integer(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ruc')
    )

    # 2. MESA
    op.create_table('mesa',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('numero', sa.Integer(), nullable=False),
        sa.Column('capacidad', sa.Integer(), nullable=True),
        sa.Column('ubicacion', sa.String(100), nullable=True),
        sa.Column('estado', sa.Enum('disponible', 'ocupada', 'reservada', 'mantenimiento', name='mesa_estado'), nullable=False, server_default='disponible'),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('activo', sa.Integer(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('numero')
    )

    # 3. CATEGORIA
    op.create_table('categoria',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('emoji', sa.String(10), nullable=True),
        sa.Column('orden', sa.Integer(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('activo', sa.Integer(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre')
    )

    # 4. PRODUCTO
    op.create_table('producto',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('sku', sa.String(50), nullable=True),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('categoria_id', sa.Integer(), nullable=False),
        sa.Column('precio', sa.Numeric(10, 2), nullable=False),
        sa.Column('costo', sa.Numeric(10, 2), nullable=True),
        sa.Column('stock', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stock_minimo', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('stock_maximo', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('imagen_url', sa.String(500), nullable=True),
        sa.Column('codigo_barras', sa.String(100), nullable=True),
        sa.Column('requiere_cantidad_frac', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('es_combo', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tiempo_prep', sa.Integer(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('activo', sa.Integer(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['categoria_id'], ['categoria.id']),
        sa.UniqueConstraint('sku')
    )

    # 5. PROVEEDOR
    op.create_table('proveedor',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('nombre', sa.String(200), nullable=False),
        sa.Column('contacto_nombre', sa.String(100), nullable=True),
        sa.Column('contacto_telefono', sa.String(20), nullable=True),
        sa.Column('contacto_email', sa.String(255), nullable=True),
        sa.Column('direccion', sa.Text(), nullable=True),
        sa.Column('ciudad', sa.String(100), nullable=True),
        sa.Column('pais', sa.String(100), nullable=True),
        sa.Column('ruc', sa.String(50), nullable=True),
        sa.Column('condicion_pago', sa.String(100), nullable=True),
        sa.Column('dias_credito', sa.Integer(), nullable=True),
        sa.Column('activo', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre')
    )

    # 6. COMPRA
    op.create_table('compra',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('numero', sa.String(50), nullable=False),
        sa.Column('fecha', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('proveedor_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=True),
        sa.Column('impuesto', sa.Numeric(12, 2), nullable=True),
        sa.Column('total', sa.Numeric(12, 2), nullable=False),
        sa.Column('estado', sa.Enum('pendiente', 'confirmada', 'entregada', 'cancelada', name='compra_estado'), nullable=False, server_default='pendiente'),
        sa.Column('fecha_entrega_esperada', sa.Date(), nullable=True),
        sa.Column('fecha_entrega', sa.DateTime(), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['proveedor_id'], ['proveedor.id']),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuario.id']),
        sa.UniqueConstraint('numero'),
        sa.Index('idx_compra_proveedor', 'proveedor_id')
    )

    # 7. DETALLE_COMPRA
    op.create_table('detalle_compra',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('compra_id', sa.Integer(), nullable=False),
        sa.Column('producto_id', sa.Integer(), nullable=False),
        sa.Column('cantidad', sa.Integer(), nullable=False),
        sa.Column('precio_unitario', sa.Numeric(10, 2), nullable=False),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=True),
        sa.Column('lote', sa.String(100), nullable=True),
        sa.Column('fecha_expiracion', sa.Date(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['compra_id'], ['compra.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['producto_id'], ['producto.id'])
    )

    # 8. INVENTARIO
    op.create_table('inventario',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('producto_id', sa.Integer(), nullable=False),
        sa.Column('cantidad_anterior', sa.Integer(), nullable=True),
        sa.Column('cantidad_nueva', sa.Integer(), nullable=True),
        sa.Column('cantidad_cambio', sa.Integer(), nullable=True),
        sa.Column('tipo_movimiento', sa.Enum('entrada', 'salida', 'ajuste', 'devolucion', 'perdida', name='inventario_tipo'), nullable=False),
        sa.Column('razon', sa.Text(), nullable=True),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('proveedor_id', sa.Integer(), nullable=True),
        sa.Column('compra_id', sa.Integer(), nullable=True),
        sa.Column('fecha_movimiento', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['producto_id'], ['producto.id']),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuario.id']),
        sa.ForeignKeyConstraint(['proveedor_id'], ['proveedor.id']),
        sa.ForeignKeyConstraint(['compra_id'], ['compra.id']),
        sa.Index('idx_inventario_producto', 'producto_id')
    )

    # 9. CLIENTE
    op.create_table('cliente',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('apellido', sa.String(100), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('telefono', sa.String(20), nullable=True),
        sa.Column('cedula_ruc', sa.String(50), nullable=True),
        sa.Column('direccion', sa.Text(), nullable=True),
        sa.Column('ciudad', sa.String(100), nullable=True),
        sa.Column('pais', sa.String(100), nullable=True),
        sa.Column('limite_credito', sa.Numeric(12, 2), nullable=True),
        sa.Column('saldo_credito', sa.Numeric(12, 2), nullable=True),
        sa.Column('nacimiento', sa.Date(), nullable=True),
        sa.Column('usuario_registro_id', sa.Integer(), nullable=True),
        sa.Column('fecha_registro', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('activo', sa.Integer(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['usuario_registro_id'], ['usuario.id']),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('cedula_ruc')
    )

    # 10. COMANDA
    op.create_table('comanda',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('numero', sa.String(50), nullable=False),
        sa.Column('mesa_id', sa.Integer(), nullable=True),
        sa.Column('cliente_id', sa.Integer(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('fecha_cierre', sa.DateTime(), nullable=True),
        sa.Column('usuario_mesero_id', sa.Integer(), nullable=True),
        sa.Column('usuario_cajero_id', sa.Integer(), nullable=True),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=True),
        sa.Column('impuesto', sa.Numeric(12, 2), nullable=True),
        sa.Column('descuento', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('total', sa.Numeric(12, 2), nullable=True),
        sa.Column('estado', sa.Enum('abierta', 'cocina', 'lista', 'pagada', 'cancelada', name='comanda_estado'), nullable=False, server_default='abierta'),
        sa.Column('tipo_cliente', sa.Enum('local', 'para_llevar', 'delivery', name='tipo_cliente'), nullable=False, server_default='local'),
        sa.Column('notas', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['mesa_id'], ['mesa.id']),
        sa.ForeignKeyConstraint(['cliente_id'], ['cliente.id']),
        sa.ForeignKeyConstraint(['usuario_mesero_id'], ['usuario.id']),
        sa.ForeignKeyConstraint(['usuario_cajero_id'], ['usuario.id']),
        sa.UniqueConstraint('numero'),
        sa.Index('idx_comanda_numero', 'numero'),
        sa.Index('idx_comanda_mesa', 'mesa_id'),
        sa.Index('idx_comanda_fecha', 'fecha_creacion')
    )

    # 11. DETALLE_COMANDA
    op.create_table('detalle_comanda',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('comanda_id', sa.Integer(), nullable=False),
        sa.Column('producto_id', sa.Integer(), nullable=False),
        sa.Column('cantidad', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('precio_unitario', sa.Numeric(10, 2), nullable=False),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=True),
        sa.Column('estado', sa.Enum('pedido', 'cocina', 'listo', 'entregado', 'cancelado', name='detalle_comanda_estado'), nullable=False, server_default='pedido'),
        sa.Column('notas', sa.Text(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['comanda_id'], ['comanda.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['producto_id'], ['producto.id']),
        sa.Index('idx_detalle_comanda', 'comanda_id')
    )

    # 12. PAGO
    op.create_table('pago',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('comanda_id', sa.Integer(), nullable=False),
        sa.Column('monto', sa.Numeric(12, 2), nullable=False),
        sa.Column('tipo_pago', sa.Enum('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'cheque', 'credito', 'otro', name='tipo_pago'), nullable=False, server_default='efectivo'),
        sa.Column('referencia_pago', sa.String(100), nullable=True),
        sa.Column('banco', sa.String(100), nullable=True),
        sa.Column('ultimos_digitos', sa.String(10), nullable=True),
        sa.Column('cuotas', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('fecha_pago', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('notas', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['comanda_id'], ['comanda.id']),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuario.id']),
        sa.Index('idx_pago_comanda', 'comanda_id')
    )

    # 13. FACTURA
    op.create_table('factura',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('numero_factura', sa.String(50), nullable=False),
        sa.Column('comanda_id', sa.Integer(), nullable=False),
        sa.Column('cliente_id', sa.Integer(), nullable=True),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('fecha_emision', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=True),
        sa.Column('impuesto', sa.Numeric(12, 2), nullable=True),
        sa.Column('total', sa.Numeric(12, 2), nullable=False),
        sa.Column('estado_pago', sa.Enum('pagada', 'pendiente', 'vencida', 'cancelada', name='estado_pago_factura'), nullable=False, server_default='pagada'),
        sa.Column('fecha_vencimiento', sa.Date(), nullable=True),
        sa.Column('notas', sa.Text(), nullable=True),
        sa.Column('xml_path', sa.String(255), nullable=True),
        sa.Column('pdf_path', sa.String(255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['comanda_id'], ['comanda.id']),
        sa.ForeignKeyConstraint(['cliente_id'], ['cliente.id']),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuario.id']),
        sa.UniqueConstraint('numero_factura'),
        sa.Index('idx_factura_numero', 'numero_factura'),
        sa.Index('idx_factura_cliente', 'cliente_id')
    )

    # 14. AUDITORIA
    op.create_table('auditoria',
        sa.Column('id', sa.Integer(), sa.Identity(always=False, start=1, increment=1), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('nombre_usuario', sa.String(100), nullable=True),
        sa.Column('accion', sa.String(100), nullable=False),
        sa.Column('modulo', sa.String(100), nullable=True),
        sa.Column('tabla_afectada', sa.String(100), nullable=True),
        sa.Column('registro_id', sa.Integer(), nullable=True),
        sa.Column('datos_antes', sa.JSON(), nullable=True),
        sa.Column('datos_despues', sa.JSON(), nullable=True),
        sa.Column('fecha_accion', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('ip_usuario', sa.String(45), nullable=True),
        sa.Column('navegador', sa.String(255), nullable=True),
        sa.Column('dispositivo', sa.String(100), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuario.id']),
        sa.Index('idx_auditoria_usuario', 'usuario_id'),
        sa.Index('idx_auditoria_tabla', 'tabla_afectada'),
        sa.Index('idx_auditoria_fecha', 'fecha_accion')
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables in reverse order of creation
    op.drop_table('auditoria')
    op.drop_table('factura')
    op.drop_table('pago')
    op.drop_table('detalle_comanda')
    op.drop_table('comanda')
    op.drop_table('cliente')
    op.drop_table('detalle_compra')
    op.drop_table('compra')
    op.drop_table('inventario')
    op.drop_table('proveedor')
    op.drop_table('producto')
    op.drop_table('categoria')
    op.drop_table('mesa')
    op.drop_table('configuracion')
