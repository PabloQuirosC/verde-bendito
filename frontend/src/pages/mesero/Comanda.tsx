import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Minus, Plus, Search, Star, ShoppingBag, Trash2, AlertTriangle, Send, Users, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { formatCRC } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api";
import { useStore } from "@/store/useStore";

const COMMON_EXTRAS = ["Aguacate", "Queso extra", "Tocineta", "Huevo extra", "Picante", "Salsa aparte"];
const COMMON_REMOVE = ["Cebolla", "Tomate", "Cilantro", "Picante", "Lácteos", "Gluten"];
const COMMON_ALLERGENS = ["Maní", "Mariscos", "Lácteos", "Gluten", "Huevo", "Soya"];

interface CartItem {
  id: string;
  qty: number;
  note?: string;
  extras?: string[];
  remove?: string[];
  allergies?: string[];
}

interface MenuProduct {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  price: number;
  stock: number;
  active: boolean;
  emoji: string;
  popular?: boolean;
  allergens?: string[];
}

interface ExistingOrderItem {
  id: number;
  producto_id: number;
  cantidad: number;
  subtotal?: string | number | null;
  notas?: string | null;
  estado?: string | null;
}

const DEFAULT_CATEGORY_LABELS = ["Desayunos", "Entradas", "Platos fuertes", "Bebidas", "Postres", "Cafetería"];
const CATEGORY_EMOJI: Record<string, string> = {
  desayunos: "🍳",
  entradas: "🥗",
  principales: "🍛",
  bebidas: "🥤",
  postres: "🍰",
  cafeteria: "☕",
};

export default function MeseroComanda() {
  const { tableId } = useParams();
  const nav = useNavigate();
  const tables = useStore((s) => s.tables);
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const currentUserId = useStore((s) => s.currentUserId);
  const loadTables = useStore((s) => s.loadTables);
  const loadProducts = useStore((s) => s.loadProducts);
  const loadCategories = useStore((s) => s.loadCategories);
  const apiCreateOrder = useStore((s) => s.apiCreateOrder);
  const apiLoadOrdersOpen = useStore((s) => s.apiLoadOrdersOpen);
  const apiAddItemToOrder = useStore((s) => s.apiAddItemToOrder);
  const apiReopenOrder = useStore((s) => s.apiReopenOrder);
  const [cat, setCat] = useState<string>("Todo");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentOrderStatus, setCurrentOrderStatus] = useState<string | null>(null);
  const [existingItems, setExistingItems] = useState<ExistingOrderItem[]>([]);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const selectedTable = useMemo(() => tables.find((t) => t.id === tableId || t.number.toString() === tableId), [tables, tableId]);
  const parsedTableId = useMemo(() => {
    const raw = Number(tableId);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }, [tableId]);

  const menuProducts = useMemo<MenuProduct[]>(() => {
    return products
      .filter((product) => product.active)
      .map((product) => {
        const category = categories.find((c) => c.id === product.category);
        const categoryLabel = category?.name ?? product.category ?? "Sin categoría";
        return {
          ...product,
          categoryLabel,
          emoji: category?.emoji ?? CATEGORY_EMOJI[String(categoryLabel).trim().toLowerCase()] ?? "🍽️",
          popular: false,
          allergens: [],
        };
      });
  }, [categories, products]);

  const categoryTabs = useMemo(() => {
    const names = categories.length > 0 ? categories.map((category) => category.name) : DEFAULT_CATEGORY_LABELS;
    return ["Todo", ...Array.from(new Set(names))];
  }, [categories]);

  useEffect(() => {
    void loadTables();
    void loadProducts();
    void loadCategories();
  }, [loadTables, loadProducts, loadCategories]);

  useEffect(() => {
    const openTable = async () => {
      if (selectedTable?.currentOrderId) {
        setCurrentOrderId(selectedTable.currentOrderId);
        return;
      }

      const mesaId = selectedTable ? Number(selectedTable.id) : parsedTableId;
      if (!mesaId) return;

      try {
        // Solo enlazar comanda existente; crearla únicamente al enviar items.
        const existing = await apiClient.obtenerComandaMesa(mesaId);
        if (existing?.success && existing?.data?.id) {
          setCurrentOrderId(String(existing.data.id));
        }
      } catch (error) {
        console.error("Error al cargar comanda de mesa:", error);
      }
    };
    void openTable();
  }, [selectedTable, parsedTableId]);

  // Cargar detalles de comanda abierta
  useEffect(() => {
    const loadOrderDetails = async () => {
      if (!currentOrderId) return;
      setLoadingOrder(true);
      try {
        const response = await apiClient.obtenerComanda(currentOrderId);
        if (response?.success && Array.isArray(response.data?.items)) {
          setExistingItems(response.data.items as ExistingOrderItem[]);
          setCurrentOrderStatus(response.data?.estado ?? null);
        } else {
          setExistingItems([]);
          setCurrentOrderStatus(null);
        }
      } catch (error) {
        console.error("Error loading order details:", error);
        setExistingItems([]);
        setCurrentOrderStatus(null);
      } finally {
        setLoadingOrder(false);
      }
    };
    void loadOrderDetails();
  }, [currentOrderId]);

  const reopenOrder = async () => {
    if (!currentOrderId) return;
    const reopened = await apiReopenOrder(Number(currentOrderId));
    if (!reopened) {
      toast.error("No se pudo reabrir la comanda");
      return;
    }

    setCurrentOrderStatus("abierta");
    toast.success("Comanda reabierta", { description: "Ya puedes agregar más productos" });
  };

  const filtered = useMemo(() => {
    return menuProducts.filter((p) => {
      if (cat !== "Todo" && p.categoryLabel !== cat) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [cat, menuProducts, query]);

  const add = (id: string) => {
    const product = menuProducts.find((p) => p.id === id);
    
    // Validar stock disponible
    if (!product || product.stock <= 0) {
      toast.error("Producto sin stock", {
        description: product ? `"${product.name}" no tiene stock disponible` : "Producto no disponible"
      });
      return;
    }

    setCart((c) => {
      const ex = c.find((i) => i.id === id);
      const newQty = ex ? ex.qty + 1 : 1;
      
      // Validar que no exceda el stock disponible
      if (newQty > product.stock) {
        toast.error("Stock insuficiente", {
          description: `Solo hay ${product.stock} ${product.name} disponibles`
        });
        return c;
      }

      if (ex) return c.map((i) => (i.id === id ? { ...i, qty: newQty } : i));
      return [...c, { id, qty: 1 }];
    });
  };
  const dec = (id: string) =>
    setCart((c) => c.flatMap((i) => (i.id === id ? (i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : []) : [i])));
  const remove = (id: string) => setCart((c) => c.filter((i) => i.id !== id));

  const subtotal = cart.reduce((s, ci) => {
    const p = menuProducts.find((x) => x.id === ci.id);
    return s + (p?.price ?? 0) * ci.qty;
  }, 0);
  const tax = Math.round(subtotal * 0.13);
  const service = Math.round(subtotal * 0.1);
  const total = subtotal + tax + service;
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const updateMods = (id: string, patch: Partial<CartItem>) =>
    setCart((c) => c.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const ensureOrderId = async (): Promise<string | null> => {
    if (currentOrderId) return currentOrderId;

    const meseroId = Number(currentUserId);
    if (!Number.isFinite(meseroId) || meseroId <= 0) {
      toast.error("No se pudo identificar al mesero actual. Vuelve a iniciar sesión.");
      return null;
    }

    const mesaId = selectedTable ? Number(selectedTable.id) : parsedTableId;
    if (!mesaId) {
      toast.error("No se pudo identificar la mesa");
      return null;
    }

    try {
      const existing = await apiClient.obtenerComandaMesa(mesaId);
      if (existing?.success && existing?.data?.id) {
        const existingId = String(existing.data.id);
        setCurrentOrderId(existingId);
        return existingId;
      }

      const result = await apiCreateOrder({
        mesa_id: mesaId,
        mesa_numero: selectedTable?.number,
        usuario_mesero_id: meseroId,
        tipo_cliente: "local",
      });

      if (result?.id) {
        const id = String(result.id);
        setCurrentOrderId(id);
        return id;
      }
    } catch (error) {
      console.error("Error creando comanda:", error);
    }

    toast.error("No hay comanda abierta");
    return null;
  };

  const send = async () => {
    const orderId = await ensureOrderId();
    if (!orderId) {
      return;
    }

    if (currentOrderStatus && currentOrderStatus !== "abierta") {
      toast.error("Reabre el pedido antes de agregar más productos");
      return;
    }
    
    if (cart.length === 0) {
      toast.info("Carrito vacío");
      return;
    }
    
    try {
      // Agregar cada item del carrito a la comanda
      let success = true;
      for (const ci of cart) {
        const p = menuProducts.find((x) => x.id === ci.id);
        if (!p) continue;
        
        const noteParts: string[] = [];
        if (ci.extras?.length) noteParts.push("+ " + ci.extras.join(", "));
        if (ci.remove?.length) noteParts.push("Sin " + ci.remove.join(", "));
        if (ci.allergies?.length) noteParts.push("Alergias: " + ci.allergies.join(", "));
        if (ci.note) noteParts.push(ci.note);
        
        const itemData = {
          producto_id: Number(p.id),
          cantidad: ci.qty,
          precio_unitario: p.price,
          notas: noteParts.join(" · ") || undefined,
        };
        
        const added = await apiAddItemToOrder(Number(orderId), itemData);
        if (!added) {
          success = false;
          break;
        }
      }
      
      if (success) {
        toast.success("Items agregados a comanda", { description: `${count} productos` });
        setCart([]); // Limpiar carrito
        const refreshed = await apiClient.obtenerComanda(orderId);
        if (refreshed?.success && Array.isArray(refreshed.data?.items)) {
          setExistingItems(refreshed.data.items as ExistingOrderItem[]);
          setCurrentOrderStatus(refreshed.data?.estado ?? currentOrderStatus);
        }
        setSummaryOpen(false);
      } else {
        toast.error("Error al agregar algunos items");
      }
    } catch (error) {
      console.error("Error al enviar:", error);
      toast.error("Error al procesar los items");
    }
  };

  const SummaryPanel = (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="rounded-2xl border border-border/70 bg-secondary/30 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-sm sm:text-lg leading-none">Resumen comanda</p>
            <p className="text-xs text-muted-foreground mt-1">Mesa {selectedTable?.number ?? tableId ?? "-"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-card px-2 py-1 text-xs font-medium border border-border">{count} items</span>
          </div>
        </div>
        {currentOrderStatus && currentOrderStatus !== "abierta" && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pedido cerrado</p>
              <p className="text-xs sm:text-sm text-foreground">Se puede volver a abrir para agregar más items.</p>
            </div>
            <Button onClick={reopenOrder} size="sm" variant="secondary" className="w-full sm:w-auto">
              Reabrir
            </Button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
        {cart.length === 0 && existingItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-4 py-8 text-center">
            <p className="text-xs sm:text-sm font-medium">Aun no hay items en la comanda</p>
            <p className="text-xs text-muted-foreground mt-1">Agrega productos desde el menu para comenzar.</p>
          </div>
        )}
        
        {existingItems.length > 0 && (
          <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Items agregados</p>
              {loadingOrder && <span className="text-[10px] text-muted-foreground">Cargando...</span>}
            </div>
            {existingItems.map((item) => (
              <div key={item.id} className="py-1 px-2 mb-1 rounded bg-card/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium flex-shrink-0">{item.cantidad}x</span>
                  <span className="flex-1 ml-2 truncate text-xs">{menuProducts.find((p) => Number(p.id) === Number(item.producto_id))?.name ?? `Producto ${item.producto_id}`}</span>
                  <span className="text-muted-foreground flex-shrink-0 ml-1">{formatCRC(Number(item.subtotal || 0))}</span>
                </div>
                {item.notas && (
                  <p className="mt-1 pl-6 text-[10px] text-muted-foreground break-words">{item.notas}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {cart.map((ci) => {
          const p = menuProducts.find((x) => x.id === ci.id);
          if (!p) return null;
          return (
            <div key={ci.id} className="rounded-2xl border border-border/70 bg-card p-2.5 sm:p-3 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold leading-tight truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatCRC(p.price)} c/u</p>
                </div>
                <button onClick={() => remove(ci.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>

              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1 rounded-full bg-secondary/70 border border-border p-0.5">
                  <button onClick={() => dec(ci.id)} className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-full hover:bg-card">
                    <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                  <span className="w-5 text-center text-xs sm:text-sm font-semibold">{ci.qty}</span>
                  <button onClick={() => add(ci.id)} className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-full hover:bg-card">
                    <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </button>
                </div>
                <p className="font-display text-xs sm:text-sm font-semibold">{formatCRC(p.price * ci.qty)}</p>
              </div>

              {(ci.extras?.length || ci.remove?.length || ci.allergies?.length || ci.note) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {ci.extras?.map((x) => <span key={"e"+x} className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success">+ {x}</span>)}
                  {ci.remove?.map((x) => <span key={"r"+x} className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Sin {x}</span>)}
                  {ci.allergies?.map((x) => <span key={"a"+x} className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-warm/20 text-warm-foreground">⚠ {x}</span>)}
                  {ci.note && <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground italic">"{ci.note}"</span>}
                </div>
              )}

              <ItemModifiersDialog title={p.name} item={ci} onSave={(patch) => updateMods(ci.id, patch)} />
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-card rounded-t-2xl border-t border-border/70 p-3 space-y-3">
        <div className="rounded-2xl border border-border/70 bg-secondary/30 p-2.5 sm:p-3 space-y-2">
          <Row label="Subtotal" value={formatCRC(subtotal)} />
          <Row label="Servicio (10%)" value={formatCRC(service)} />
          <Row label="Impuestos (13%)" value={formatCRC(tax)} />
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
            <p className="font-display text-sm sm:text-base">Total</p>
            <p className="font-display text-lg sm:text-2xl font-semibold text-primary">{formatCRC(total)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Dialog>
            <DialogTrigger asChild>
            </DialogTrigger>
            <DialogContent className="rounded-3xl">
              <SplitInline total={total} onConfirm={(n) => toast.success(`Comanda dividida en ${n} subcuentas`)} />
            </DialogContent>
          </Dialog>
        </div>

        <Button
          onClick={send}
          disabled={count === 0}
          className="w-full h-11 sm:h-13 rounded-xl sm:rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-float font-semibold text-xs sm:text-sm"
          size="lg"
        >
          <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          Agregar · {formatCRC(total)}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:px-6">
      <div>
        <PageHeader
          title={`Mesa ${selectedTable?.number ?? tableId ?? "—"}`}
          subtitle="Cliente · Sin asignar"
          back="/mesero/mesas"
          brand={false}
        />

        <div className="px-4 mt-1">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full h-11 rounded-xl bg-secondary/70 border-0 pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="px-4 mt-3">
          <div className="scroll-x">
            {categoryTabs.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "chip",
                  cat === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 mt-3 space-y-2 pb-56 lg:pb-6">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">Sin productos para tu búsqueda.</p>
          )}
          {filtered.map((p) => {
            const inCart = cart.find((c) => c.id === p.id);
            return (
              <article
                key={p.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl bg-card border shadow-soft p-2.5 transition",
                  inCart ? "border-primary/40 ring-1 ring-primary/15" : "border-border/60"
                )}
              >
                <div className="relative h-14 w-14 shrink-0 rounded-xl bg-gradient-warm grid place-items-center text-2xl">
                  <span>{p.emoji}</span>
                  {p.popular && (
                    <span className="absolute -top-1 -left-1 grid h-4 w-4 place-items-center rounded-full bg-warm text-warm-foreground shadow-soft">
                      <Star className="h-2.5 w-2.5 fill-current" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight line-clamp-1">{p.name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <p className="font-display text-sm text-foreground">{formatCRC(p.price)}</p>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">· {p.categoryLabel}</span>
                  </div>
                  {p.allergens && p.allergens.length > 0 && (
                    <p className="text-[10px] text-warm-foreground mt-0.5 inline-flex items-center gap-1">
                      <AlertTriangle className="h-2.5 w-2.5" /> {p.allergens.join(", ")}
                    </p>
                  )}
                </div>

                {inCart ? (
                  <div className="flex items-center gap-1 rounded-full bg-secondary p-0.5 shrink-0">
                    <button
                      onClick={() => dec(p.id)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-card text-foreground hover:bg-card/80 active:scale-95 shadow-soft"
                      aria-label="Quitar uno"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{inCart.qty}</span>
                    <button
                      onClick={() => add(p.id)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-soft"
                      aria-label="Agregar uno"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => add(p.id)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-soft"
                    aria-label={`Agregar ${p.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* Desktop side panel */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 rounded-3xl bg-card border border-border/60 shadow-card p-5 max-h-[calc(100vh-2rem)] overflow-hidden">
          {SummaryPanel}
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
        <SheetTrigger asChild>
          <button className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 inline-flex w-[calc(100%-2rem)] max-w-sm items-center justify-between gap-3 rounded-full bg-surface-deep text-surface-deep-foreground px-4 py-3 shadow-float ring-1 ring-border/30 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-md flex-shrink-0">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">Resumen</p>
              <p className="text-sm font-bold">{count} items · {formatCRC(total)}</p>
            </div>
            <span className="text-2xl flex-shrink-0">›</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="flex h-[85vh] flex-col overflow-hidden rounded-t-3xl p-4 sm:p-5">
          <SheetHeader className="text-left mb-3">
            <SheetTitle className="font-display text-lg sm:text-xl">Mesa {selectedTable?.number ?? tableId}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            {SummaryPanel}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SplitInline({ total, onConfirm }: { total: number; onConfirm: (n: number) => void }) {
  const nav = useNavigate();
  const [people, setPeople] = useState(2);
  const per = Math.ceil(total / people);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-secondary p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="font-display text-2xl mt-0.5">{formatCRC(total)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Por persona</p>
          <p className="font-display text-2xl mt-0.5 text-primary">{formatCRC(per)}</p>
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Personas</label>
        <div className="mt-2 flex items-center justify-center gap-4">
          <button onClick={() => setPeople((p) => Math.max(2, p - 1))} className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-xl">−</button>
          <span className="font-display text-4xl w-16 text-center">{people}</span>
        </div>
      </div>
      <Button onClick={() => onConfirm(people)} className="w-full h-12 rounded-xl">Confirmar división</Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function ItemModifiersDialog({ title, item, onSave }: { title: string; item: CartItem; onSave: (p: Partial<CartItem>) => void }) {
  const [open, setOpen] = useState(false);
  const [extras, setExtras] = useState<string[]>(item.extras ?? []);
  const [removeList, setRemoveList] = useState<string[]>(item.remove ?? []);
  const [allergies, setAllergies] = useState<string[]>(item.allergies ?? []);
  const [note, setNote] = useState(item.note ?? "");

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) {
        setExtras(item.extras ?? []);
        setRemoveList(item.remove ?? []);
        setAllergies(item.allergies ?? []);
        setNote(item.note ?? "");
      }
    }}>
      <DialogTrigger asChild>
        <button className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-card border border-border py-1.5 text-[11px] font-medium hover:bg-secondary">
          <Pencil className="h-3 w-3" /> Personalizar / alergias
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          <DialogDescription>Agrega extras, quita ingredientes o anota alergias.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ChipGroup label="Agregar extras" tone="success" options={COMMON_EXTRAS} value={extras} onChange={(v) => toggle(extras, v, setExtras)} />
          <ChipGroup label="Quitar ingredientes" tone="destructive" options={COMMON_REMOVE} value={removeList} onChange={(v) => toggle(removeList, v, setRemoveList)} />
          <ChipGroup label="Alergias" tone="warm" options={COMMON_ALLERGENS} value={allergies} onChange={(v) => toggle(allergies, v, setAllergies)} />

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Comentario</p>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. cocción término medio, sin sal…" rows={2} />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
          <Button onClick={() => { onSave({ extras, remove: removeList, allergies, note }); setOpen(false); toast.success("Modificadores guardados"); }}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChipGroup({ label, options, value, onChange, tone }: { label: string; options: string[]; value: string[]; onChange: (v: string) => void; tone: "success" | "destructive" | "warm" }) {
  const cls = tone === "success" ? "bg-success/15 text-success border-success/30" : tone === "destructive" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-warm/20 text-warm-foreground border-warm/30";
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = value.includes(o);
          return (
            <button key={o} type="button" onClick={() => onChange(o)} className={cn("text-xs px-2.5 py-1 rounded-full border transition", active ? cls : "bg-card border-border text-muted-foreground hover:bg-secondary")}>
              {active ? "✓ " : "+ "}{o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
