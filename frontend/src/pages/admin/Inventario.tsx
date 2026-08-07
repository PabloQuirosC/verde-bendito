import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, AlertCircle, AlertTriangle, Circle, Edit, Package, Plus, Search, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHeader } from "@/components/PageHeader";
import { Pager } from "@/components/Pager";
import { usePagination } from "@/hooks/use-pagination";
import { apiClient } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { formatCRC } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryDef, Product } from "@/store/types";

type Section = "productos" | "categorias" | "movimientos" | "stock_bajo";

const MOVIMIENTO_TIPOS = ["entrada", "salida", "ajuste", "devolucion", "perdida"] as const;
type TipoMovimiento = (typeof MOVIMIENTO_TIPOS)[number];

type ProductForm = {
  id: string;
  name: string;
  category: string;
  price: string;
  stock: string;
  minStock: string;
  active: boolean;
};

type CategoryForm = {
  id: string;
  name: string;
  emoji: string;
};

type MovimientoForm = {
  producto_id: string;
  cantidad_cambio: string;
  tipo_movimiento: TipoMovimiento;
  razon: string;
  proveedor_id: string;
  compra_id: string;
};

type CompraResumen = {
  id: number;
  numero: string;
  proveedor_id: number;
  proveedor_nombre?: string | null;
  fecha?: string | null;
  estado?: string | null;
  total?: number | null;
  detalles_count?: number | null;
};

type MovimientoItem = {
  id: number;
  producto_id: number;
  cantidad_anterior: number;
  cantidad_nueva: number;
  cantidad_cambio: number;
  tipo_movimiento: MovimientoForm["tipo_movimiento"];
  razon?: string | null;
  fecha_movimiento?: string | null;
};

const defaultProductForm = (product?: Product | null): ProductForm => ({
  id: product?.id ?? "",
  name: product?.name ?? "",
  category: product?.category ?? "principales",
  price: product ? String(product.price) : "0",
  stock: product ? String(product.stock) : "0",
  minStock: product ? String(product.minStock) : "5",
  active: product?.active ?? true,
});

const defaultCategoryForm = (category?: CategoryDef | null): CategoryForm => ({
  id: category?.id ?? "",
  name: category?.name ?? "",
  emoji: category?.emoji ?? "🍽️",
});

const defaultMovimientoForm = (): MovimientoForm => ({
  producto_id: "",
  cantidad_cambio: "",
  tipo_movimiento: "entrada",
  razon: "",
  proveedor_id: "",
  compra_id: "",
});

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export default function AdminInventario() {
  const products = useStore((state) => state.products);
  const categories = useStore((state) => state.categories);
  const upsertProduct = useStore((state) => state.upsertProduct);
  const removeProduct = useStore((state) => state.removeProduct);
  const upsertCategory = useStore((state) => state.upsertCategory);
  const removeCategory = useStore((state) => state.removeCategory);
  const { apiCreateProduct, apiUpdateProduct, apiDeleteProduct, apiCreateCategory, apiUpdateCategory, apiDeleteCategory, loadProducts, loadCategories, apiListarInventario } = useStore();

  const [section, setSection] = useState<Section>("productos");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [categorySearch, setCategorySearch] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductForm>(defaultProductForm());
  const [editingCategory, setEditingCategory] = useState<CategoryForm>(defaultCategoryForm());
  const [deleteTarget, setDeleteTarget] = useState<{ type: Section; id: string; name: string } | null>(null);
  const [deleteReassignTo, setDeleteReassignTo] = useState<string>("");
  const [movimientos, setMovimientos] = useState<MovimientoItem[]>([]);
  const [compras, setCompras] = useState<CompraResumen[]>([]);
  const [loadingCompras, setLoadingCompras] = useState(false);

  // Cargar datos desde la API cuando el componente se monta
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryFilter !== "todas" && product.category !== categoryFilter) return false;
      if (!query) return true;
      const cat = categories.find((item) => item.id === product.category);
      const haystack = [product.name, product.category, cat?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [products, categories, search, categoryFilter]);

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    return categories.filter((category) => {
      if (!query) return true;
      return [category.name, category.id, category.emoji].join(" ").toLowerCase().includes(query);
    });
  }, [categories, categorySearch]);

  const productPager = usePagination(filteredProducts, 6);
  const categoryPager = usePagination(filteredCategories, 6);

  useEffect(() => {
    if (productDialogOpen) return;
    setEditingProduct(defaultProductForm());
  }, [productDialogOpen]);

  useEffect(() => {
    if (categoryDialogOpen) return;
    setEditingCategory(defaultCategoryForm());
  }, [categoryDialogOpen]);

  const [movimientoDialogOpen, setMovimientoDialogOpen] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState<MovimientoForm>(defaultMovimientoForm());
  const [savingMovimiento, setSavingMovimiento] = useState(false);
  const { apiCreateMovimiento } = useStore();

  useEffect(() => {
    if (movimientoDialogOpen) return;
    setEditingMovimiento(defaultMovimientoForm());
  }, [movimientoDialogOpen]);

  const loadMovimientos = async () => {
    try {
      const response = await apiListarInventario();
      if (Array.isArray(response)) {
        setMovimientos(response as MovimientoItem[]);
      }
    } catch (error) {
      console.error("Error loading inventory movements:", error);
    }
  };

  const loadCompras = async () => {
    try {
      setLoadingCompras(true);
      const response = await apiClient.listarCompras(0, 500);
      if (response?.success && Array.isArray(response.data)) {
        setCompras(response.data as CompraResumen[]);
      } else {
        setCompras([]);
      }
    } catch (error) {
      console.error("Error loading purchases:", error);
      setCompras([]);
    } finally {
      setLoadingCompras(false);
    }
  };

  useEffect(() => {
    loadMovimientos();
    loadCompras();
  }, []);

  const comprasConDetalle = useMemo(
    () => compras.filter((compra) => Number(compra.detalles_count ?? 0) > 0 && compra.estado === "pendiente"),
    [compras]
  );

  const proveedoresDeCompras = useMemo(() => {
    const mapa = new Map<number, string>();
    compras.forEach((compra) => {
      if (!mapa.has(compra.proveedor_id)) {
        mapa.set(compra.proveedor_id, compra.proveedor_nombre || `Proveedor #${compra.proveedor_id}`);
      }
    });
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [compras]);

  const comprasFiltradas = useMemo(() => {
    const proveedorId = editingMovimiento.proveedor_id ? Number(editingMovimiento.proveedor_id) : null;
    return comprasConDetalle.filter((compra) => !proveedorId || compra.proveedor_id === proveedorId);
  }, [comprasConDetalle, editingMovimiento.proveedor_id]);

  const setProveedorMovimiento = (proveedorId: string) => {
    setEditingMovimiento((current) => ({
      ...current,
      proveedor_id: proveedorId,
      compra_id: "",
      cantidad_cambio: "",
    }));
  };

  const setCompraMovimiento = async (compraId: string) => {
    setEditingMovimiento((current) => ({ ...current, compra_id: compraId }));

    if (!compraId) {
      setEditingMovimiento((current) => ({ ...current, cantidad_cambio: "" }));
      return;
    }

    const compraBase = comprasConDetalle.find((compra) => compra.id === Number(compraId));
    if (compraBase) {
      setEditingMovimiento((current) => ({
        ...current,
        proveedor_id: String(compraBase.proveedor_id),
      }));
    }

    try {
      const response = await apiClient.obtenerCompra(Number(compraId));
      const detalles = Array.isArray(response?.data?.detalles) ? response.data.detalles : [];
      const cantidadTotal = detalles.reduce((acc: number, detalle: { cantidad?: number }) => acc + Number(detalle.cantidad ?? 0), 0);

      setEditingMovimiento((current) => ({
        ...current,
        cantidad_cambio: cantidadTotal > 0 ? String(cantidadTotal) : current.cantidad_cambio,
      }));
    } catch (error) {
      console.error("Error loading purchase details:", error);
      toast.error("No se pudo cargar la compra seleccionada");
    }
  };

  const lowStock = products.filter((product) => product.stock <= product.minStock);
  const activeProducts = products.filter((product) => product.active).length;
  const inactiveProducts = products.length - activeProducts;

  const openCreateProduct = () => {
    setEditingProduct({
      ...defaultProductForm(),
      category: categories[0]?.id ?? "",
    });
    setProductDialogOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(defaultProductForm(product));
    setProductDialogOpen(true);
  };

  const openCreateCategory = () => {
    setEditingCategory(defaultCategoryForm());
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: CategoryDef) => {
    setEditingCategory(defaultCategoryForm(category));
    setCategoryDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    const name = editingProduct.name.trim();
    if (!name) {
      toast.error("El nombre del producto es requerido");
      return;
    }

    const selectedCategoryId = Number.parseInt(editingProduct.category, 10);
    const fallbackCategoryId = Number.parseInt(categories[0]?.id ?? "1", 10);
    const categoriaId = Number.isFinite(selectedCategoryId) ? selectedCategoryId : fallbackCategoryId;

    if (!Number.isFinite(categoriaId)) {
      toast.error("Selecciona una categoría válida");
      return;
    }

      const payload = {
      nombre: name,
      categoria_id: categoriaId,
      precio: Number(editingProduct.price) || 0,
      stock: Number(editingProduct.stock) || 0,
      stock_minimo: Number(editingProduct.minStock) || 0,
      activo: editingProduct.active,
    };

    try {
      let success = false;
      if (editingProduct.id) {
        // Actualizar
        success = await apiUpdateProduct(Number(editingProduct.id), payload);
      } else {
        // Crear 
        success = await apiCreateProduct(payload);
      }

      if (success) {
        toast.success(editingProduct.id ? "Producto actualizado" : "Producto creado");
        setProductDialogOpen(false);
        setEditingProduct(defaultProductForm());
      } else {
        toast.error("Error al guardar el producto");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al guardar producto");
    }
  };

  const handleSaveCategory = async () => {
    const name = editingCategory.name.trim();
    if (!name) {
      toast.error("El nombre de la categoría es requerido");
      return;
    }

    const payload = {
      nombre: name,
      emoji: editingCategory.emoji.trim() || "🏷️",
    };

    try {
      let success = false;
      if (editingCategory.id) {
        // Actualizar
        success = await apiUpdateCategory(Number(editingCategory.id), payload);
      } else {
        // Crear
        success = await apiCreateCategory(payload);
      }

      if (success) {
        toast.success(editingCategory.id ? "Categoría actualizada" : "Categoría creada");
        setCategoryDialogOpen(false);
        setEditingCategory(defaultCategoryForm());
      } else {
        toast.error("Error al guardar la categoría");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al guardar categoría");
    }
  };

  const handleSaveMovimiento = async () => {
    if (!editingMovimiento.producto_id) {
      toast.error("Selecciona un producto");
      return;
    }

    if (!MOVIMIENTO_TIPOS.includes(editingMovimiento.tipo_movimiento)) {
      toast.error("Selecciona un tipo de movimiento válido");
      return;
    }

    const cantidad = Number(editingMovimiento.cantidad_cambio);
    if (cantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    setSavingMovimiento(true);
    try {
      const proveedorId = editingMovimiento.proveedor_id ? Number(editingMovimiento.proveedor_id) : null;
      const compraId = editingMovimiento.compra_id ? Number(editingMovimiento.compra_id) : null;
      const success = await apiCreateMovimiento({
        producto_id: Number(editingMovimiento.producto_id),
        cantidad_cambio: cantidad,
        tipo_movimiento: editingMovimiento.tipo_movimiento,
        razon: editingMovimiento.razon.trim() || null,
        proveedor_id: proveedorId,
        compra_id: compraId,
      });

      if (success) {
        // Si es una entrada y tiene compra_id, marcar la compra como entregada
        if (editingMovimiento.tipo_movimiento === "entrada" && compraId) {
          try {
            await apiClient.actualizarCompra(compraId, { estado: "entregada" });
          } catch (error) {
            console.error("Error al actualizar compra:", error);
            // No mostrar error al usuario, el movimiento ya se guardó
          }
        }

        toast.success("Movimiento registrado");
        setMovimientoDialogOpen(false);
        setEditingMovimiento(defaultMovimientoForm());
        await loadMovimientos();
        await loadCompras(); // Recargar compras para actualizar la lista
      } else {
        toast.error("No se pudo registrar el movimiento");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al registrar movimiento");
    } finally {
      setSavingMovimiento(false);
    }
  };

  const requestDeleteProduct = (product: Product) => {
    setDeleteTarget({ type: "productos", id: product.id, name: product.name });
    setDeleteDialogOpen(true);
  };

  const requestDeleteCategory = (category: CategoryDef) => {
    setDeleteTarget({ type: "categorias", id: category.id, name: category.name });
    // preselect another category if available
    const other = categories.find((c) => c.id !== category.id);
    setDeleteReassignTo(other ? other.id : "");
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      let success = false;
      if (deleteTarget.type === "productos") {
        success = await apiDeleteProduct(Number(deleteTarget.id));
      } else if (deleteTarget.type === "categorias") {
        const hasProducts = products.some((product) => product.category === deleteTarget.id);
        if (hasProducts) {
          if (!deleteReassignTo) {
            toast.error("Selecciona una categoría destino para reasignar los productos");
            return;
          }
          // attempt deletion with reassignment if selected
          const reassignId = deleteReassignTo ? Number(deleteReassignTo) : undefined;
          success = await apiDeleteCategory(Number(deleteTarget.id), reassignId);
        } else {
          success = await apiDeleteCategory(Number(deleteTarget.id));
        }
      }

      if (success) {
        toast.success("Eliminado correctamente");
      } else {
        toast.error("Error al eliminar");
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      setDeleteReassignTo("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      setDeleteReassignTo("");
    }
  };

  const emptyMessage = section === "productos" ? "Sin productos para este filtro." : "Sin categorías para esta búsqueda.";
  const hasProductsForDelete = deleteTarget?.type === "categorias" && products.some((product) => product.category === deleteTarget?.id);
  const otherCategoriesForDelete = categories.filter((c) => c.id !== deleteTarget?.id);

  return (
    <>
      <PageHeader
        title="Inventario"
        subtitle={`${products.length} productos · ${categories.length} categorías · ${lowStock.length} alertas`}
        brand={false}
        right={
          <Button
            onClick={section === "productos" ? openCreateProduct : section === "categorias" ? openCreateCategory : () => setMovimientoDialogOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-full px-0 shadow-soft"
            size="icon"
            aria-label={section === "productos" ? "Nuevo producto" : section === "categorias" ? "Nueva categoría" : "Nuevo movimiento"}
          >
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 lg:px-6 pt-4 pb-8 space-y-4">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Productos activos</p>
            <p className="mt-2 text-2xl font-semibold">{activeProducts}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Productos inactivos</p>
            <p className="mt-2 text-2xl font-semibold">{inactiveProducts}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Stock bajo</p>
            <p className="mt-2 text-2xl font-semibold">{lowStock.length}</p>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSection("productos")}
            className={cn("chip inline-flex items-center gap-2", section === "productos" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}
          >
            <Package className="h-4 w-4" /> Productos
          </button>
          <button
            onClick={() => setSection("categorias")}
            className={cn("chip inline-flex items-center gap-2", section === "categorias" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}
          >
            <Tag className="h-4 w-4" /> Categorías
          </button>
          <button
            onClick={() => setSection("stock_bajo")}
            className={cn("chip inline-flex items-center gap-2", section === "stock_bajo" ? "bg-destructive/20 text-destructive" : "bg-secondary text-secondary-foreground")}
          >
            <AlertCircle className="h-4 w-4" /> Stock Bajo ({lowStock.length})
          </button>
          <button
            onClick={() => setSection("movimientos")}
            className={cn("chip inline-flex items-center gap-2", section === "movimientos" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}
          >
            <Activity className="h-4 w-4" /> Movimientos
          </button>
        </div>

        {lowStock.length > 0 && section === "productos" && (
          <div className="rounded-2xl bg-warm/10 border border-warm/30 p-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-warm-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{lowStock.length} productos con stock bajo</p>
              <p className="text-xs text-muted-foreground">Revisa los productos bajo su mínimo para evitar quiebres de inventario.</p>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={section === "productos" ? search : categorySearch}
            onChange={(e) => {
              if (section === "productos") {
                setSearch(e.target.value);
                productPager.setPage(1);
              } else {
                setCategorySearch(e.target.value);
                categoryPager.setPage(1);
              }
            }}
            placeholder={section === "productos" ? "Buscar producto, categoría o emoji..." : "Buscar categoría..."}
            className="w-full h-11 rounded-xl bg-secondary border-0 pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {section === "productos" ? (
          <>
            <div className="scroll-x">
              {(["todas", ...categories.map((category) => category.id)] as string[]).map((item) => {
                const label = item === "todas" ? "Todas" : categories.find((category) => category.id === item)?.name ?? item;
                return (
                  <button
                    key={item}
                    onClick={() => {
                      setCategoryFilter(item);
                      productPager.setPage(1);
                    }}
                    className={cn("chip capitalize", categoryFilter === item ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50 border-b border-border/60">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Producto</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Precio</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productPager.pageItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                          {emptyMessage}
                        </td>
                      </tr>
                    ) : (
                      productPager.pageItems.map((product) => {
                        const category = categories.find((item) => item.id === product.category);
                        return (
                          <tr key={product.id} className="border-b border-border/60 hover:bg-secondary/30 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-warm font-display text-sm flex-shrink-0">
                                  {getInitials(product.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{product.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{product.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm truncate">{category ? `${category.emoji} ${category.name}` : product.category}</p>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{formatCRC(product.price)}</td>
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", product.stock <= product.minStock ? "bg-warm/20 text-warm-foreground" : "bg-success/15 text-success")}>{product.stock}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <Circle className={cn("h-2 w-2 fill-current", product.active ? "text-success" : "text-muted-foreground")} />
                                <span className="text-xs">{product.active ? "Activo" : "Inactivo"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => openEditProduct(product)}
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                                  title="Editar producto"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => requestDeleteProduct(product)}
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                                  title="Eliminar producto"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Pager page={productPager.page} totalPages={productPager.totalPages} onPrev={productPager.prev} onNext={productPager.next} onGo={productPager.setPage} />
            </div>
          </>
        ) : section === "categorias" ? (
          <>
            <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50 border-b border-border/60">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Productos</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryPager.pageItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                          {emptyMessage}
                        </td>
                      </tr>
                    ) : (
                      categoryPager.pageItems.map((category) => {
                        const count = products.filter((product) => product.category === category.id).length;
                        return (
                          <tr key={category.id} className="border-b border-border/60 hover:bg-secondary/30 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-warm font-display text-sm flex-shrink-0">
                                  {category.emoji}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{category.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{count} producto{count === 1 ? "" : "s"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{category.id}</td>
                            <td className="px-4 py-3 text-sm">{count}</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => openEditCategory(category)}
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                                  title="Editar categoría"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => requestDeleteCategory(category)}
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                                  title={count > 0 ? "Eliminar con reasignación" : "Eliminar categoría"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Pager page={categoryPager.page} totalPages={categoryPager.totalPages} onPrev={categoryPager.prev} onNext={categoryPager.next} onGo={categoryPager.setPage} />
            </div>
          </>
        ) : section === "stock_bajo" ? (
          <div className="space-y-4">
            {lowStock.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card px-4 py-8 text-center shadow-soft">
                <AlertCircle className="mx-auto h-6 w-6 text-success" />
                <p className="mt-2 text-sm text-muted-foreground">No hay productos con stock bajo</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 shadow-soft">
                  <p className="text-sm font-medium text-destructive">⚠️ {lowStock.length} producto(s) con stock bajo del mínimo requerido</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-secondary/50 border-b border-border/60">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Producto</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock Actual</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock Mínimo</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-destructive">Diferencia</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStock.map((product) => {
                          const diff = product.minStock - product.stock;
                          return (
                            <tr key={product.id} className="border-b border-border/60 hover:bg-secondary/30 transition">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-warm font-display text-sm flex-shrink-0">
                                    {getInitials(product.name)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{product.name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-right">{categories.find((c) => c.id === product.category)?.name || "—"}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-destructive">{product.stock}</td>
                              <td className="px-4 py-3 text-sm text-right text-muted-foreground">{product.minStock}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-destructive">-{diff} unidades</td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => openEditProduct(product)}
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                                    title="Editar producto"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50 border-b border-border/60">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Producto</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cantidad</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Razón</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                          Crea tu primer movimiento haciendo clic en el botón + arriba.
                        </td>
                      </tr>
                    ) : (
                      movimientos.map((movimiento) => {
                        const product = products.find((item) => Number(item.id) === movimiento.producto_id);
                        const fecha = movimiento.fecha_movimiento ? new Date(movimiento.fecha_movimiento).toLocaleString() : "-";
                        return (
                          <tr key={movimiento.id} className="border-b border-border/60 hover:bg-secondary/30 transition">
                            <td className="px-4 py-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{product?.name ?? `Producto #${movimiento.producto_id}`}</p>
                                <p className="text-xs text-muted-foreground truncate">ID {movimiento.producto_id}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", movimiento.tipo_movimiento === "entrada" ? "bg-success/15 text-success" : movimiento.tipo_movimiento === "salida" ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground")}>{movimiento.tipo_movimiento}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">{movimiento.cantidad_cambio}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{movimiento.razon || "-"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{fecha}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={productDialogOpen} onOpenChange={(open) => (open ? setProductDialogOpen(true) : setProductDialogOpen(false))}>
        <DialogContent className="w-[min(96vw,42rem)] max-h-[90vh] overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader>
            <div className="border-b border-border/60 bg-gradient-to-br from-background to-secondary/30 px-6 py-5 text-left">
              <DialogTitle className="text-xl">{editingProduct.id ? "Editar producto" : "Nuevo producto"}</DialogTitle>
              <DialogDescription className="mt-1 max-w-2xl">Crea o actualiza un producto del inventario desde este modal.</DialogDescription>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-12rem)] overflow-y-auto px-6 py-5">
            <div className="space-y-4 rounded-2xl bg-card border border-border/60 shadow-soft p-4">
              <Field label="Nombre">
                <Input value={editingProduct.name} onChange={(e) => setEditingProduct((current) => ({ ...current, name: e.target.value }))} />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Categoría">
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct((current) => ({ ...current, category: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl bg-secondary border-0 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.emoji} {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {/* emoji removed from product form */}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Precio">
                  <Input type="number" min={0} step="0.01" value={editingProduct.price} onChange={(e) => setEditingProduct((current) => ({ ...current, price: e.target.value }))} />
                </Field>
                <Field label="Stock">
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min={0}
                      value={editingProduct.stock}
                      disabled
                      readOnly
                      className="mt-1.5 h-11 rounded-xl bg-secondary/70 border-0 px-4 text-sm outline-none opacity-70 cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                      El stock se actualiza automáticamente al registrar una entrada de inventario.
                    </p>
                  </div>
                </Field>
              </div>

              <Field label="Stock mínimo">
                <Input type="number" min={0} value={editingProduct.minStock} onChange={(e) => setEditingProduct((current) => ({ ...current, minStock: e.target.value }))} />
              </Field>

              <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Producto activo</p>
                  <p className="text-xs text-muted-foreground">Los productos inactivos se siguen mostrando en el listado.</p>
                </div>
                <Switch checked={editingProduct.active} onCheckedChange={(value) => setEditingProduct((current) => ({ ...current, active: value }))} />
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-border/60 bg-background px-6 py-4 gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setProductDialogOpen(false)} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveProduct} className="flex-1 sm:flex-none">
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={(open) => (open ? setCategoryDialogOpen(true) : setCategoryDialogOpen(false))}>
        <DialogContent className="w-[min(96vw,34rem)] max-h-[90vh] overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader>
            <div className="border-b border-border/60 bg-gradient-to-br from-background to-secondary/30 px-6 py-5 text-left">
              <DialogTitle className="text-xl">{editingCategory.id ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
              <DialogDescription className="mt-1 max-w-2xl">Mantén aquí las categorías que usarás para agrupar los productos.</DialogDescription>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-12rem)] overflow-y-auto px-6 py-5">
            <div className="space-y-4 rounded-2xl bg-card border border-border/60 shadow-soft p-4">
              <Field label="Nombre">
                <Input value={editingCategory.name} onChange={(e) => setEditingCategory((current) => ({ ...current, name: e.target.value }))} placeholder="Ej. Bebidas frías" />
              </Field>
              <Field label="Emoji">
                <Input value={editingCategory.emoji} onChange={(e) => setEditingCategory((current) => ({ ...current, emoji: e.target.value }))} placeholder="🍹" />
              </Field>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-border/60 bg-background px-6 py-4 gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setCategoryDialogOpen(false)} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveCategory} className="flex-1 sm:flex-none">
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[min(96vw,28rem)]">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {deleteTarget?.type === "productos" ? "Eliminar producto" : "Eliminar categoría"}
            </DialogTitle>
            <DialogDescription className="mt-2">
              {deleteTarget?.type === "productos"
                ? `¿Deseas eliminar ${deleteTarget?.name}? Esta acción no se puede deshacer.`
                : `¿Deseas eliminar ${deleteTarget?.name}? No debe tener productos asociados.`}
            </DialogDescription>
          </DialogHeader>
          {deleteTarget?.type === "categorias" && hasProductsForDelete && (
            <div className="px-4 pb-4">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Reasignar productos a</label>
              <select
                value={deleteReassignTo}
                onChange={(e) => setDeleteReassignTo(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl bg-secondary border-0 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">-- Selecciona categoría destino --</option>
                {otherCategoriesForDelete.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null); setDeleteReassignTo(""); }} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} className="flex-1 sm:flex-none">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movimientoDialogOpen} onOpenChange={(open) => (open ? setMovimientoDialogOpen(true) : setMovimientoDialogOpen(false))}>
        <DialogContent className="w-[min(96vw,42rem)] max-h-[90vh] overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader>
            <div className="border-b border-border/60 bg-gradient-to-br from-background to-secondary/30 px-6 py-5 text-left">
              <DialogTitle className="text-xl">Registrar Movimiento de Inventario</DialogTitle>
              <DialogDescription className="mt-1 max-w-2xl">Registra una entrada, salida o ajuste de stock para tus productos.</DialogDescription>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-12rem)] overflow-y-auto px-6 py-5">
            <div className="space-y-4 rounded-2xl bg-card border border-border/60 shadow-soft p-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Producto</label>
                <select
                  value={editingMovimiento.producto_id}
                  onChange={(e) => setEditingMovimiento((current) => ({ ...current, producto_id: e.target.value }))}
                  className="mt-1.5 h-11 w-full rounded-xl bg-secondary border-0 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Selecciona un producto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Stock: {product.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de Movimiento</label>
                  <select
                    value={editingMovimiento.tipo_movimiento}
                    onChange={(e) =>
                      setEditingMovimiento((current) => ({
                        ...current,
                        tipo_movimiento: MOVIMIENTO_TIPOS.includes(e.target.value as TipoMovimiento)
                          ? (e.target.value as TipoMovimiento)
                          : current.tipo_movimiento,
                        ...(e.target.value === "entrada" ? {} : { proveedor_id: "", compra_id: "" }),
                      }))
                    }
                    className="mt-1.5 h-11 w-full rounded-xl bg-secondary border-0 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {MOVIMIENTO_TIPOS.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo === "entrada"
                          ? "Entrada"
                          : tipo === "salida"
                            ? "Salida"
                            : tipo === "ajuste"
                              ? "Ajuste"
                              : tipo === "devolucion"
                                ? "Devolución"
                                : "Pérdida"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Cantidad</label>
                  <Input
                    type="number"
                    min={1}
                    value={editingMovimiento.cantidad_cambio}
                    onChange={(e) =>
                      setEditingMovimiento((current) => ({ ...current, cantidad_cambio: e.target.value }))
                    }
                    placeholder="0"
                    className="mt-1.5 h-11 rounded-xl bg-secondary border-0 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              {editingMovimiento.tipo_movimiento === "entrada" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Proveedor</label>
                    <select
                      value={editingMovimiento.proveedor_id}
                      onChange={(e) => setProveedorMovimiento(e.target.value)}
                      className="mt-1.5 h-11 w-full rounded-xl bg-secondary border-0 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Selecciona un proveedor</option>
                      {proveedoresDeCompras.map((proveedor) => (
                        <option key={proveedor.id} value={proveedor.id}>
                          {proveedor.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Compra</label>
                    <select
                      value={editingMovimiento.compra_id}
                      onChange={(e) => setCompraMovimiento(e.target.value)}
                      disabled={loadingCompras || comprasFiltradas.length === 0}
                      className="mt-1.5 h-11 w-full rounded-xl bg-secondary border-0 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    >
                      <option value="">{loadingCompras ? "Cargando compras..." : "Selecciona una compra entregada"}</option>
                      {comprasFiltradas.map((compra) => (
                        <option key={compra.id} value={compra.id}>
                          {compra.numero} · {compra.proveedor_nombre || `Proveedor #${compra.proveedor_id}`}
                        </option>
                      ))}
                    </select>
                    {loadingCompras ? (
                      <div className="pt-1">
                        <LoadingSpinner size="sm" variant="dots" text="Cargando compras..." />
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {editingMovimiento.tipo_movimiento === "entrada" && editingMovimiento.compra_id && (
                <div className="rounded-xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                  La cantidad se tomó de los detalles de la compra seleccionada. Si lo necesitas, puedes ajustarla manualmente.
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Razón (opcional)</label>
                <Textarea
                  value={editingMovimiento.razon}
                  onChange={(e) => setEditingMovimiento((current) => ({ ...current, razon: e.target.value }))}
                  placeholder="Ej. Compra a proveedor, ajuste de inventario, etc."
                  className="mt-1.5 min-h-24 rounded-xl bg-secondary border-0 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-border/60 bg-background px-6 py-4 gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setMovimientoDialogOpen(false)} disabled={savingMovimiento} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveMovimiento} disabled={savingMovimiento} className="flex-1 sm:flex-none">
              {savingMovimiento ? "Registrando..." : "Registrar Movimiento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}