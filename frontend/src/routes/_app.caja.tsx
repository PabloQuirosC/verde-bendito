import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Banknote, CreditCard as CardIcon, Smartphone, Printer, RotateCcw, Split, Plus, Trash2, Check } from "lucide-react";
import { useStore } from "@/store/useStore";
import { OrderStatusBadge } from "@/components/StatusBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCRC, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentMethod, Payment } from "@/store/types";
import { Receipt } from "@/components/Receipt";

export const Route = createFileRoute("/_app/caja")({
  component: CajaPage,
});

type Mode = "single" | "split";

interface SplitPart {
  id: string;
  amount: string;
  method: PaymentMethod;
  reference: string;
  paid: boolean;
}

function CajaPage() {
  const orders = useStore((s) => s.orders);
  const payOrder = useStore((s) => s.payOrder);
  const payOrderSplit = useStore((s) => s.payOrderSplit);
  const returnToWaiter = useStore((s) => s.returnToWaiter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("single");
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [received, setReceived] = useState("");
  const [reference, setReference] = useState("");
  const [printing, setPrinting] = useState<string | null>(null);
  const [splitParts, setSplitParts] = useState<SplitPart[]>([]);

  const payable = orders.filter((o) => o.status === "listo");
  const recent = orders.filter((o) => o.status === "cobrado").slice(-8).reverse();
  const selected = orders.find((o) => o.id === selectedId);

  const receivedNum = parseFloat(received) || 0;
  const change = method === "efectivo" && selected ? receivedNum - selected.total : 0;

  const openOrder = (id: string) => {
    setSelectedId(id);
    setMode("single");
    setReceived("");
    setReference("");
    setSplitParts([]);
  };

  const closePanel = () => {
    setSelectedId(null);
    setReceived("");
    setReference("");
    setSplitParts([]);
  };

  const handlePay = () => {
    if (!selected) return;
    if (method === "efectivo" && receivedNum < selected.total) return;
    payOrder(selected.id, {
      method,
      amount: selected.total,
      received: method === "efectivo" ? receivedNum : undefined,
      change: method === "efectivo" ? change : undefined,
      reference: method !== "efectivo" ? reference : undefined,
    });
    setPrinting(selected.id);
    closePanel();
  };

  const handleSplitPay = () => {
    if (!selected) return;
    const payments: Payment[] = splitParts
      .filter((p) => parseFloat(p.amount) > 0)
      .map((p) => ({
        method: p.method,
        amount: parseFloat(p.amount) || 0,
        reference: p.reference || undefined,
      }));
    if (payments.length === 0) return;
    payOrderSplit(selected.id, payments);
    setPrinting(selected.id);
    closePanel();
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="font-display text-2xl sm:text-3xl mb-1">Caja</h1>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4 md:mb-6">
        {payable.length} orden{payable.length === 1 ? "" : "es"} lista{payable.length === 1 ? "" : "s"} para cobrar
      </p>

      {selected ? (
        <PayPanel
          order={selected}
          mode={mode}
          setMode={(m) => {
            setMode(m);
            if (m === "split" && splitParts.length === 0) {
              setSplitParts([
                { id: "1", amount: String(Math.round(selected.total / 2)), method: "efectivo", reference: "", paid: false },
                { id: "2", amount: String(selected.total - Math.round(selected.total / 2)), method: "efectivo", reference: "", paid: false },
              ]);
            }
          }}
          method={method}
          setMethod={setMethod}
          received={received}
          setReceived={setReceived}
          reference={reference}
          setReference={setReference}
          change={change}
          splitParts={splitParts}
          setSplitParts={setSplitParts}
          onCancel={closePanel}
          onPay={handlePay}
          onSplitPay={handleSplitPay}
          onReturn={() => {
            returnToWaiter(selected.id);
            closePanel();
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          <section>
            <h2 className="font-display text-base sm:text-lg mb-3">Listas para cobrar</h2>
            <div className="space-y-3">
              {payable.length === 0 && (
                <div className="pos-card p-8 text-center text-sm text-muted-foreground">
                  No hay órdenes pendientes de cobro.
                </div>
              )}
              {payable.map((o) => (
                <motion.button
                  key={o.id}
                  whileHover={{ y: -1 }}
                  onClick={() => openOrder(o.id)}
                  className="pos-card w-full p-3 md:p-4 text-left flex items-center gap-3 md:gap-4 hover:border-primary"
                >
                  <div className="h-11 w-11 md:h-12 md:w-12 rounded-lg bg-primary/15 text-primary grid place-items-center font-display text-lg md:text-xl shrink-0">
                    {o.tableNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm md:text-base truncate">Mesa {o.tableNumber} · {o.code}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {o.items.length} ítems · {o.waiterName} · {formatTime(o.updatedAt)}
                    </div>
                  </div>
                  <div className="font-display text-base md:text-xl text-primary whitespace-nowrap">
                    {formatCRC(o.total)}
                  </div>
                </motion.button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-lg mb-3">Cobros recientes</h2>
            <div className="space-y-2">
              {recent.length === 0 && (
                <div className="pos-card p-6 text-center text-sm text-muted-foreground">
                  Aún no hay cobros.
                </div>
              )}
              {recent.map((o) => (
                <div key={o.id} className="pos-card p-3 flex items-center gap-3 text-sm">
                  <OrderStatusBadge status={o.status} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">Mesa {o.tableNumber} · {o.code}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {o.payment?.method} · {formatTime(o.updatedAt)}
                    </div>
                  </div>
                  <div className="font-semibold whitespace-nowrap">{formatCRC(o.total)}</div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPrinting(o.id)}
                    aria-label="Reimprimir"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {printing && <Receipt orderId={printing} onClose={() => setPrinting(null)} />}
    </div>
  );
}

interface PayPanelProps {
  order: NonNullable<ReturnType<typeof useStore.getState>["orders"][number]>;
  mode: Mode;
  setMode: (m: Mode) => void;
  method: PaymentMethod;
  setMethod: (m: PaymentMethod) => void;
  received: string;
  setReceived: (s: string) => void;
  reference: string;
  setReference: (s: string) => void;
  change: number;
  splitParts: SplitPart[];
  setSplitParts: React.Dispatch<React.SetStateAction<SplitPart[]>>;
  onCancel: () => void;
  onPay: () => void;
  onSplitPay: () => void;
  onReturn: () => void;
}

function PayPanel({
  order, mode, setMode, method, setMethod, received, setReceived, reference, setReference,
  change, splitParts, setSplitParts, onCancel, onPay, onSplitPay, onReturn,
}: PayPanelProps) {
  const methods: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "efectivo", label: "Efectivo", icon: Banknote },
    { id: "sinpe", label: "SINPE", icon: Smartphone },
    { id: "tarjeta", label: "Tarjeta", icon: CardIcon },
  ];

  const valid =
    method !== "efectivo" || (parseFloat(received) || 0) >= order.total;

  const splitSum = splitParts.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const splitDiff = order.total - splitSum;
  const splitValid = splitParts.length >= 2 && Math.abs(splitDiff) < 1;

  const splitEqual = (n: number) => {
    const base = Math.floor(order.total / n);
    const rest = order.total - base * (n - 1);
    setSplitParts(
      Array.from({ length: n }, (_, i) => ({
        id: String(i + 1),
        amount: String(i === n - 1 ? rest : base),
        method: "efectivo" as PaymentMethod,
        reference: "",
        paid: false,
      })),
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 md:gap-6">
      {/* Resumen */}
      <div className="pos-card p-4 md:p-5">
        <div className="flex items-center gap-2 md:gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">{order.code}</div>
            <h2 className="font-display text-xl md:text-2xl truncate">Mesa {order.tableNumber}</h2>
          </div>
          <Button variant="outline" size="sm" onClick={onReturn} className="shrink-0">
            <RotateCcw className="h-3.5 w-3.5 md:mr-1.5" />
            <span className="hidden md:inline">Devolver a mesero</span>
          </Button>
        </div>

        <div className="border-t pt-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Detalle</div>
          <ul className="divide-y">
            {order.items.map((it) => (
              <li key={it.id} className="py-2 flex items-baseline gap-2 text-sm">
                <span className="font-bold w-6 text-primary">{it.qty}×</span>
                <span className="flex-1 min-w-0 truncate">{it.name}</span>
                <span className="whitespace-nowrap">{formatCRC(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCRC(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IVA 13%</span>
            <span>{formatCRC(order.tax)}</span>
          </div>
          <div className="flex justify-between font-display text-xl md:text-2xl pt-1 text-primary">
            <span>Total</span>
            <span>{formatCRC(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Cobro */}
      <div className="pos-card p-4 md:p-5">
        {/* Toggle modo */}
        <div className="grid grid-cols-2 gap-1 mb-4 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setMode("single")}
            className={cn(
              "py-2 rounded-md text-sm font-medium transition",
              mode === "single" ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            Pago único
          </button>
          <button
            onClick={() => setMode("split")}
            className={cn(
              "py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-1.5",
              mode === "split" ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            <Split className="h-3.5 w-3.5" />
            Dividir
          </button>
        </div>

        {mode === "single" ? (
          <SinglePayment
            methods={methods}
            method={method}
            setMethod={setMethod}
            received={received}
            setReceived={setReceived}
            reference={reference}
            setReference={setReference}
            change={change}
            order={order}
          />
        ) : (
          <SplitPayment
            parts={splitParts}
            setParts={setSplitParts}
            total={order.total}
            sum={splitSum}
            diff={splitDiff}
            splitEqual={splitEqual}
            methods={methods}
          />
        )}

        <Button
          size="lg"
          className="w-full h-14 text-base mt-5"
          disabled={mode === "single" ? !valid : !splitValid}
          onClick={mode === "single" ? onPay : onSplitPay}
        >
          Confirmar pago · {formatCRC(order.total)}
        </Button>
      </div>
    </div>
  );
}

function SinglePayment({
  methods, method, setMethod, received, setReceived, reference, setReference, change, order,
}: {
  methods: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[];
  method: PaymentMethod;
  setMethod: (m: PaymentMethod) => void;
  received: string;
  setReceived: (s: string) => void;
  reference: string;
  setReference: (s: string) => void;
  change: number;
  order: PayPanelProps["order"];
}) {
  return (
    <>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
        Método de pago
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {methods.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition",
                method === m.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{m.label}</span>
            </button>
          );
        })}
      </div>

      {method === "efectivo" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Monto recibido</label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              className="h-12 text-lg font-semibold mt-1"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[order.total, 10000, 20000].map((v) => (
              <Button
                key={v}
                variant="outline"
                size="sm"
                onClick={() => setReceived(String(Math.ceil(v / 1000) * 1000))}
              >
                {formatCRC(Math.ceil(v / 1000) * 1000)}
              </Button>
            ))}
          </div>
          <div className="flex justify-between font-display text-lg pt-2">
            <span>Vuelto</span>
            <span className={cn(change < 0 && "text-destructive")}>
              {formatCRC(Math.max(0, change))}
            </span>
          </div>
        </div>
      )}

      {method !== "efectivo" && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {method === "sinpe" ? "Número de comprobante SINPE" : "Últimos 4 dígitos / autorización"}
          </label>
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="h-12 mt-1"
            placeholder="Opcional"
          />
        </div>
      )}
    </>
  );
}

function SplitPayment({
  parts, setParts, total, sum, diff, splitEqual, methods,
}: {
  parts: SplitPart[];
  setParts: React.Dispatch<React.SetStateAction<SplitPart[]>>;
  total: number;
  sum: number;
  diff: number;
  splitEqual: (n: number) => void;
  methods: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[];
}) {
  const updatePart = (id: string, patch: Partial<SplitPart>) =>
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const addPart = () =>
    setParts((prev) => [
      ...prev,
      { id: String(Date.now()), amount: "0", method: "efectivo", reference: "", paid: false },
    ]);

  const removePart = (id: string) =>
    setParts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Dividir entre
        </div>
        <div className="flex gap-1">
          {[2, 3, 4].map((n) => (
            <Button key={n} size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => splitEqual(n)}>
              ÷{n}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-[340px] overflow-auto -mx-1 px-1">
        {parts.map((p, idx) => (
          <div key={p.id} className="border rounded-lg p-3 space-y-2 bg-background/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground w-12">#{idx + 1}</span>
              <Input
                type="number"
                inputMode="decimal"
                value={p.amount}
                onChange={(e) => updatePart(p.id, { amount: e.target.value })}
                className="h-9 font-semibold"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive shrink-0"
                onClick={() => removePart(p.id)}
                disabled={parts.length <= 2}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex gap-1">
              {methods.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => updatePart(p.id, { method: m.id })}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md border text-xs transition",
                      p.method === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={addPart}>
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar parte
      </Button>

      <div className="border-t pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Suma de partes</span>
          <span className="font-semibold">{formatCRC(sum)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total a cubrir</span>
          <span className="font-semibold">{formatCRC(total)}</span>
        </div>
        <div className={cn(
          "flex justify-between font-display text-base pt-1",
          Math.abs(diff) < 1 ? "text-primary" : "text-destructive",
        )}>
          <span className="flex items-center gap-1.5">
            {Math.abs(diff) < 1 && <Check className="h-4 w-4" />}
            {diff > 0 ? "Falta" : diff < 0 ? "Sobra" : "Cuadrado"}
          </span>
          <span>{formatCRC(Math.abs(diff))}</span>
        </div>
      </div>
    </div>
  );
}
