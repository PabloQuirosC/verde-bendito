import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Minus, Plus, Send, Trash2, ShoppingCart, CreditCard, X, Check, LogOut } from "lucide-react";
import { useStore } from "@/store/useStore";
import { OrderStatusBadge } from "@/components/StatusBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCRC } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category, OrderStatus } from "@/store/types";

export const Route = createFileRoute("/_app/mesas/$orderId")({
  component: OrderEditor,
});

function OrderEditor() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const order = useStore((s) => s.orders.find((o) => o.id === orderId));
  const storeSetOrderStatus = useStore((s) => s.setOrderStatus);
  const products = useStore((s) => s.products);
  const storeCategories = useStore((s) => s.categories);
  const addItem = useStore((s) => s.addItem);
  const updateItemQty = useStore((s) => s.updateItemQty);
  const removeItem = useStore((s) => s.removeItem);
  const sendToKitchen = useStore((s) => s.sendToKitchen);
  const sendToCashier = useStore((s) => s.sendToCashier);
  const [cat, setCat] = useState<Category | "todas">("todas");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const setOrderStatus = (status: OrderStatus) => {
    if (order) storeSetOrderStatus(order.id, status);
  };

  const CATEGORIES = useMemo(
    () => [
      { id: "todas" as const, label: "Todos", emoji: "🍽️" },
      ...storeCategories.map((c) => ({ id: c.id, label: c.name, emoji: c.emoji })),
    ],
    [storeCategories],
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false;
      if (cat !== "todas" && p.category !== cat) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, cat, search]);

  if (!order) {
    return (
      <div className="p-2 sm:p-4 md:p-8 text-center">
        <p className="text-[10px] sm:text-xs md:text-sm">Orden no encontrada.</p>
        <Link to="/mesas" className="text-primary underline text-[10px] sm:text-xs md:text-sm">
          Volver a mesas
        </Link>
      </div>
    );
  }

  const clearTable = useStore((s) => s.clearTable);
  const itemsCount = order.items.reduce((s, i) => s + i.qty, 0);
  const editable = order.status === "borrador";
  const canAddItems = order.status !== "cobrado"; // Permite agregar en borrador, pendiente, proceso, listo, entregado
  const canSendToCashier = order.status === "entregado";
  const canMarkDelivered = order.status === "listo";
  const canCloseMesa = order.status === "cobrado";

  const cartContent = (
    <>
      <div className="p-2 sm:p-3 md:p-4 border-b flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">Comanda</div>
          <div className="font-display text-base sm:text-lg md:text-xl">
            {itemsCount} {itemsCount === 1 ? "ítem" : "ítems"}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8 shrink-0 ml-2"
          onClick={() => setCartOpen(false)}
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-2 sm:px-3 py-2 min-h-0">
        <AnimatePresence initial={false}>
          {order.items.length === 0 && (
            <div className="p-4 sm:p-6 text-center text-[10px] sm:text-xs md:text-sm text-muted-foreground">
              Toca un producto para agregarlo a la comanda.
            </div>
          )}
          {order.items.map((it) => (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-muted/40 rounded-md"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[10px] sm:text-xs md:text-sm truncate">{it.name}</div>
                <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
                  {formatCRC(it.price)} c/u
                </div>
              </div>
              {canAddItems && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    onClick={() => updateItemQty(order.id, it.id, it.qty - 1)}
                  >
                    <Minus className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                  </Button>
                  <span className="w-4 sm:w-5 text-center font-semibold text-[9px] sm:text-xs">{it.qty}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    onClick={() => updateItemQty(order.id, it.id, it.qty + 1)}
                  >
                    <Plus className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 sm:h-6 sm:w-6 text-destructive"
                    onClick={() => removeItem(order.id, it.id)}
                  >
                    <Trash2 className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                  </Button>
                </div>
              )}
              <div className="w-12 sm:w-16 md:w-20 text-right font-semibold text-[10px] sm:text-xs md:text-sm">
                {formatCRC(it.price * it.qty)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="border-t p-2 sm:p-3 md:p-4 space-y-1 text-[10px] sm:text-xs md:text-sm">
        <Row label="Subtotal" value={formatCRC(order.subtotal)} />
        <Row label="IVA 13%" value={formatCRC(order.tax)} />
        <Row
          label={<span className="font-display text-xs sm:text-sm md:text-base text-foreground">Total</span>}
          value={
            <span className="font-display text-lg sm:text-xl md:text-2xl text-primary">
              {formatCRC(order.total)}
            </span>
          }
        />
        <div className="pt-1.5 sm:pt-2 space-y-1 sm:space-y-1.5">
          {editable && (
            <Button
              size="lg"
              className="w-full h-9 sm:h-10 md:h-12 text-[10px] sm:text-xs md:text-base"
              disabled={order.items.length === 0}
              onClick={() => {
                sendToKitchen(order.id);
                setCartOpen(false);
                navigate({ to: "/mesas" });
              }}
            >
              <Send className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Enviar a cocina</span>
              <span className="sm:hidden">Cocina</span>
            </Button>
          )}
          {canMarkDelivered && (
            <Button
              size="lg"
              variant="secondary"
              className="w-full h-9 sm:h-10 md:h-12 text-[10px] sm:text-xs md:text-base"
              onClick={() => {
                setOrderStatus("entregado");
                setCartOpen(false);
                navigate({ to: "/mesas" });
              }}
            >
              <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Marcar entregado</span>
              <span className="sm:hidden">Entregado</span>
            </Button>
          )}
          {canSendToCashier && (
            <Button
              size="lg"
              variant="default"
              className="w-full h-9 sm:h-10 md:h-12 text-[10px] sm:text-xs md:text-base"
              onClick={() => {
                sendToCashier(order.id);
                setCartOpen(false);
                navigate({ to: "/mesas" });
              }}
            >
              <CreditCard className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Enviar a caja</span>
              <span className="sm:hidden">Caja</span>
            </Button>
          )}
          {canCloseMesa && (
            <Button
              size="lg"
              variant="secondary"
              className="w-full h-9 sm:h-10 md:h-12 text-[10px] sm:text-xs md:text-base"
              onClick={() => {
                clearTable(order.id);
                setCartOpen(false);
                navigate({ to: "/mesas" });
              }}
            >
              <LogOut className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Cerrar mesa</span>
              <span className="sm:hidden">Cerrar</span>
            </Button>
          )}
          {order.status === "entregado" && !canSendToCashier && (
            <div className="text-center text-[9px] sm:text-[10px] md:text-xs text-muted-foreground py-1.5 sm:py-2">
              Entregado · Listo para el cliente
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full relative">
      {/* POS de productos */}
      <div className="flex-1 flex flex-col min-h-0 lg:border-r">
        <div className="p-2 sm:p-3 md:p-6 border-b bg-card/50 flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => navigate({ to: "/mesas" })}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">{order.code}</div>
              <h1 className="font-display text-base sm:text-lg md:text-2xl leading-tight truncate">
                Mesa {order.tableNumber}
              </h1>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-8 text-xs sm:text-sm"
          />
          <div className="flex gap-1 sm:gap-1.5 overflow-x-auto -mx-0.5 px-0.5 pb-0.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={cn(
                  "px-1.5 sm:px-2.5 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-medium border whitespace-nowrap transition shrink-0",
                  cat === c.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted",
                )}
              >
                <span className="mr-0.5">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2 sm:p-3 md:p-6 pb-20 sm:pb-24 lg:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3">
            {filtered.map((p) => {
              const out = p.stock <= 0;
              const low = p.stock <= p.minStock;
              return (
                <motion.button
                  key={p.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={out || !canAddItems}
                  onClick={() =>
                    addItem(order.id, {
                      productId: p.id,
                      name: p.name,
                      price: p.price,
                      qty: 1,
                    })
                  }
                  className={cn(
                    "pos-card p-2 sm:p-3 md:p-4 text-left flex flex-col gap-1 sm:gap-1.5 md:gap-2 min-h-[100px] sm:min-h-[110px] md:min-h-[120px] relative",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "hover:border-primary/60",
                  )}
                >
                  <div className="text-xl sm:text-2xl md:text-3xl">{p.emoji}</div>
                  <div className="font-medium text-[11px] sm:text-xs md:text-sm leading-tight line-clamp-2">{p.name}</div>
                  <div className="mt-auto flex items-center justify-between gap-1 text-[10px] sm:text-xs">
                    <div className="font-display text-xs sm:text-sm md:text-base text-primary">
                      {formatCRC(p.price)}
                    </div>
                    {out ? (
                      <span className="text-[10px] font-bold text-destructive">SIN STOCK</span>
                    ) : low ? (
                      <span className="text-[10px] font-bold text-warning-foreground">BAJO</span>
                    ) : null}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Carrito desktop */}
      <aside className="hidden lg:flex w-[380px] flex-col bg-card">
        {cartContent}
      </aside>

      {/* FAB carrito móvil */}
      <button
        onClick={() => setCartOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-30 h-12 sm:h-14 px-3 sm:px-5 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-2 sm:gap-3 font-semibold text-xs sm:text-base"
      >
        <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="text-xs sm:text-sm">{itemsCount}</span>
        <span className="hidden sm:inline font-display text-xs sm:text-base">{formatCRC(order.total)}</span>
        <span className="sm:hidden font-display text-[10px]">{formatCRC(order.total)}</span>
      </button>

      {/* Drawer carrito móvil */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
              className="lg:hidden fixed inset-0 bg-background/70 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="lg:hidden fixed inset-y-0 right-0 w-full max-w-xs sm:max-w-sm bg-card z-50 flex flex-col shadow-2xl"
            >
              {cartContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}
