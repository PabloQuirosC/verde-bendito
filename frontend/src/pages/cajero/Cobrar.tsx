import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Banknote, CreditCard, Smartphone, Printer, Users, Check, Receipt, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { formatCRC } from "@/data/mock";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTicketSettings } from "@/lib/ticketSettings";
import apiClient from "@/lib/api";

interface OrderItem { id: number; name: string; qty: number; price: number; subtotal: number; estado?: string; notas?: string | null; }

type LoadedOrder = {
  id: number;
  numero: string;
  mesa_id?: number | null;
  cliente_id?: number | null;
  estado?: string;
  total?: number;
  items: OrderItem[];
  waiterName?: string | null;
};

type Method = "efectivo" | "tarjeta" | "sinpe";

const GENERIC_CLIENT = {
  id: null,
  nombre: "Cliente genérico",
  email: null,
  telefono: null,
  cedula: null,
};

export default function CajeroCobrar() {
  const nav = useNavigate();
  const { orderId } = useParams();
  const [method, setMethod] = useState<Method>("efectivo");
  const [received, setReceived] = useState("");
  const [order, setOrder] = useState<LoadedOrder | null>(null);
  const [pagos, setPagos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings] = useTicketSettings();
  // Cliente search / selection
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<Array<any>>([]);
  const [clientSearching, setClientSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(GENERIC_CLIENT);
  const [selectedMesa, setSelectedMesa] = useState<any | null>(null);
  // Crear cliente rápido
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newApellido, setNewApellido] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTelefono, setNewTelefono] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  useEffect(() => {
    let active = true;

    const loadOrder = async () => {
      if (!orderId) {
        setError("No se recibió la comanda a cobrar");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const isNumericId = /^\d+$/.test(String(orderId));
        const response = isNumericId
          ? await apiClient.obtenerComanda(orderId)
          : await apiClient.obtenerComandaPorNumero(orderId);
        const data = response?.data ?? response;
        const items = Array.isArray(data?.items)
          ? data.items.map((item: any) => ({
              id: Number(item.id),
              name: item.producto_nombre ?? item.nombre ?? `Item ${item.id}`,
              qty: Number(item.cantidad ?? 1),
              price: Number(item.precio_unitario ?? 0),
              subtotal: Number(item.subtotal ?? Number(item.cantidad ?? 1) * Number(item.precio_unitario ?? 0)),
              estado: item.estado,
              notas: item.notas,
            }))
          : [];

        const total = Number(data?.total ?? items.reduce((sum: number, item: OrderItem) => sum + item.subtotal, 0));

        if (active) {
          setOrder({
            id: Number(data?.id ?? orderId),
            numero: String(data?.numero ?? orderId),
            mesa_id: data?.mesa_id ?? null,
            cliente_id: data?.cliente_id ?? null,
            estado: data?.estado,
            total,
            items,
            waiterName: data?.usuario_mesero_nombre ?? data?.mesero_nombre ?? data?.waiterName ?? data?.usuario_mesero?.nombre ?? null,
          });
          // cargar pagos asociados
          try {
            const pagosRes = await apiClient.obtenerPagosComanda(Number(data?.id ?? orderId));
            const pagosData = pagosRes?.data ?? pagosRes;
            setPagos(Array.isArray(pagosData?.pagos) ? pagosData.pagos : pagosData?.pagos ?? []);
          } catch (err) {
            console.warn("No se pudieron cargar pagos:", err);
          }
          // Si la comanda ya tiene cliente_id, cargar datos del cliente
          if (data?.cliente_id) {
            try {
              const clienteRes = await apiClient.obtenerCliente(data.cliente_id);
              const clienteData = clienteRes?.data ?? clienteRes;
              if (clienteData) {
                setSelectedClient({
                  id: clienteData.id,
                  nombre: `${clienteData.nombre} ${clienteData.apellido ?? ""}`.trim(),
                  email: clienteData.email ?? null,
                  telefono: clienteData.telefono ?? null,
                  cedula: clienteData.cedula_ruc ?? clienteData.cedula ?? null,
                });
              }
            } catch (err) {
              // no bloquear carga si falla
              console.warn("No se pudo cargar cliente asociado:", err);
              setSelectedClient(GENERIC_CLIENT);
            }
          } else {
            setSelectedClient(GENERIC_CLIENT);
          }
          // Si la comanda ya tiene mesa_id, cargar datos de la mesa
          if (data?.mesa_id) {
            try {
              const mesaRes = await apiClient.obtenerMesa(data.mesa_id);
              const mesaData = mesaRes?.data ?? mesaRes;
              if (mesaData) {
                setSelectedMesa(mesaData);
              }
            } catch (err) {
              console.warn("No se pudo cargar mesa asociada:", err);
            }
          }
        }
      } catch (fetchError) {
        console.error("Error loading order:", fetchError);
        if (active) setError("No se pudo cargar la comanda");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadOrder();
    return () => {
      active = false;
    };
  }, [orderId]);

  const items = order?.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const service = settings.showService ? Math.round(subtotal * 0.1) : 0;
  const tax = settings.showTax ? Math.round(subtotal * 0.13) : 0;
  const total = subtotal + service + tax;
  const change = Math.max(0, (parseFloat(received) || 0) - total);

  const finish = async () => {
    if (!order) {
      toast.error("No hay comanda cargada");
      return;
    }

    setSaving(true);
    try {
      const amount = method === "efectivo" ? Math.max(total, parseFloat(received) || total) : total;
      const paymentPayload = {
        comanda_id: order.id,
        monto: amount,
        tipo_pago: method === "efectivo" ? "efectivo" : method === "tarjeta" ? "tarjeta_credito" : "transferencia",
        referencia_pago: method === "sinpe" ? `SINPE-${order.numero}` : null,
        banco: method === "sinpe" ? "SINPE" : null,
        ultimos_digitos: null,
        cuotas: 1,
        notas: `Cobro ${method}`,
      };

      const paymentResponse = await apiClient.registrarPago(paymentPayload);
      if (!paymentResponse?.success) {
        throw new Error(paymentResponse?.message ?? "No se pudo registrar el pago");
      }

      const closeResponse = await apiClient.cerrarComanda(order.id);
      if (!closeResponse?.success) {
        throw new Error(closeResponse?.message ?? "No se pudo cerrar la comanda");
      }

      toast.success("Pago confirmado", { description: `Ticket ${order.numero} · ${formatCRC(total)}` });
      setTimeout(() => nav("/cajero"), 700);
    } catch (paymentError: any) {
      console.error("Error finishing payment:", paymentError);
      toast.error(paymentError?.message ?? "No  pudo completar el cobro");
    } finally {
      setSaving(false);
    }
  };

  const quick = [5000, 10000, 20000, 50000];
  const paymentOptions: Array<{
    id: Method;
    icon: typeof Banknote;
    label: string;
    description: string;
    accent: string;
    soft: string;
  }> = [
    { id: "efectivo", icon: Banknote, label: "Efectivo", description: "Pago inmediato en caja", accent: "border-emerald-500", soft: "bg-emerald-500/10 text-emerald-700" },
    { id: "tarjeta", icon: CreditCard, label: "Tarjeta", description: "Débito o crédito", accent: "border-sky-500", soft: "bg-sky-500/10 text-sky-700" },
    { id: "sinpe", icon: Smartphone, label: "SINPE", description: "Transferencia móvil", accent: "border-violet-500", soft: "bg-violet-500/10 text-violet-700" },
  ];

  const searchClients = async () => {
    if (!clientQuery || clientQuery.trim().length < 1) {
      setClientResults([]);
      return;
    }
    setClientSearching(true);
    try {
      const res = await apiClient.buscarClientesPorNombre(clientQuery.trim());
      const data = res?.data ?? res;
      setClientResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error buscando clientes:", err);
      toast.error("Error buscando clientes");
    } finally {
      setClientSearching(false);
    }
  };

  // Debounce automatic search
  useEffect(() => {
    const q = clientQuery?.trim();
    if (!q || q.length < 1) {
      setClientResults([]);
      return;
    }
    const t = setTimeout(() => {
      void searchClients();
    }, 400);
    return () => clearTimeout(t);
  }, [clientQuery]);

  const createClient = async () => {
    if (!newNombre || newNombre.trim().length < 1) {
      toast.error("Nombre requerido");
      return;
    }
    setCreatingClient(true);
    try {
      const payload = {
        nombre: newNombre.trim(),
        apellido: newApellido.trim() || null,
        email: newEmail.trim() || null,
        telefono: newTelefono.trim() || null,
      };
      const res = await apiClient.crearCliente(payload);
      const id = res?.data?.id ?? res?.id ?? null;
      if (!id) throw new Error("No se obtuvo id");
      const client = { id, nombre: `${payload.nombre} ${payload.apellido || ''}`.trim(), email: payload.email, telefono: payload.telefono };
      setSelectedClient(client);
      setOrder((o) => (o ? { ...o, cliente_id: id } : o));
      setCreateDialogOpen(false);
      setNewNombre(""); setNewApellido(""); setNewEmail(""); setNewTelefono("");
      toast.success("Cliente creado");
    } catch (err) {
      console.error("Error creando cliente:", err);
      toast.error("No se pudo crear cliente");
    } finally {
      setCreatingClient(false);
    }
  };

  const headerSubtitle = `Mesa ${selectedMesa?.numero ?? selectedMesa?.nombre ?? order?.mesa_id ?? "—"} · ${selectedClient?.nombre ?? "Cliente genérico"}`;

  return (
    <>
      <PageHeader
        title={`Cobrar · ${orderId}`}
        subtitle={headerSubtitle}
        back="/cajero"
        right={order ? (
          <span className="inline-flex items-center gap-2 bg-success/10 text-success px-3 py-1 rounded-full text-xs">
            <span className="h-2 w-2 rounded-full bg-success" /> Orden activa
          </span>
        ) : undefined}
      />

      <div className="px-4 pb-32 lg:pb-8 space-y-4">
        {loading && (
          <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-8 flex items-center justify-center min-h-64">
            <LoadingSpinner size="md" text="Cargando comanda..." variant="dots" />
          </section>
        )}

        {error && (
          <section className="rounded-2xl bg-destructive/10 border border-destructive/30 shadow-soft p-4 text-sm text-destructive">
            {error}
          </section>
        )}

        <section className="rounded-[1.75rem] border border-border/50 bg-card shadow-soft">
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground">Mesa {selectedMesa?.numero ?? selectedMesa?.nombre ?? "—"}</h2>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary/10 text-primary">{order?.estado ? String(order.estado).replace(/_/g, " ") : "Borrador"}</span>
                </div>
                <p className="mt-2.5 text-sm text-muted-foreground">Ticket <span className="font-mono font-medium text-foreground">{order?.numero ?? orderId ?? "—"}</span></p>
                {order?.waiterName && String(order.waiterName).trim().toLowerCase() !== 'sin asignar' && String(order.waiterName).trim().toLowerCase() !== 'sistema' ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">Atendió: <span className="font-medium text-foreground">{order.waiterName}</span></p>
                ) : null}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="mt-2 text-3xl sm:text-4xl font-display font-bold text-foreground tabular-nums">{formatCRC(total)}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-border/40 bg-muted/30 overflow-hidden">
                <ul className="divide-y divide-border/30">
            {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{it.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{it.qty} × {formatCRC(it.price)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{formatCRC(it.subtotal)}</p>
                </li>
            ))}
                </ul>
              </div>

              <div className="space-y-2 px-0.5">
                <Row label="Subtotal" value={formatCRC(subtotal)} />
                {settings.showService && <Row label="Servicio (10%)" value={formatCRC(service)} />}
                {settings.showTax && <Row label="Impuestos (13%)" value={formatCRC(tax)} />}
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Total a pagar</p>
                  <p className="text-2xl font-display font-bold text-primary tabular-nums">{formatCRC(total)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <SplitByItemsDialog
                items={items}
                service={service}
                tax={tax}
                orderId={order?.id}
                onDone={async (id?: number | null) => {
                  if (!id) return;
                  try {
                    const pagosRes = await apiClient.obtenerPagosComanda(id);
                    const pagosData = pagosRes?.data ?? pagosRes;
                    const pagosList = Array.isArray(pagosData?.pagos) ? pagosData.pagos : pagosData?.pagos ?? [];
                    setPagos(pagosList);

                    const totalPagado = Number(pagosData?.total_pagado ?? 0);
                    try {
                      const comandaRes = await apiClient.obtenerComanda(id);
                      const comandaData = comandaRes?.data ?? comandaRes;
                      const comandaTotal = Number(comandaData?.total ?? 0);
                      if (totalPagado >= comandaTotal && comandaTotal > 0) {
                        const closeRes = await apiClient.cerrarComanda(id);
                        if (closeRes?.success) {
                          toast.success("Comanda cerrada automáticamente");
                          setOrder((o) => o ? { ...o, estado: 'pagada' } : o);
                        }
                      } else {
                        // actualizar total en UI
                        setOrder((o) => o ? { ...o, total: Number(comandaData?.total ?? o.total) } : o);
                      }
                    } catch (err2) {
                      console.warn('No se pudo obtener comanda para evaluar cierre:', err2);
                    }
                  } catch (err) {
                    console.warn('No se pudieron actualizar pagos tras crear subcuentas', err);
                  }
                }}
              />
              <PreviewTicketDialog items={items} subtotal={subtotal} service={service} tax={tax} total={total} orderId={order?.numero ?? orderId ?? ""} client={selectedClient} mesa={selectedMesa} waiter={order?.waiterName ?? undefined} />
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button onClick={() => toast("Reimprimiendo ticket…")} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-secondary/70 px-4 text-sm font-medium hover:bg-secondary">
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            </div>

          </div>
        </section>

        <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
          <p className="text-sm font-medium mb-3">Cliente</p>
          <div className="flex items-center gap-2">
            <Input
              className="rounded-full bg-secondary/10 px-4 py-2"
              placeholder="Buscar por nombre o cédula"
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void searchClients(); }}
              disabled={clientSearching}
            />
            <Button onClick={() => void searchClients()} size="sm" className="whitespace-nowrap" disabled={clientSearching}>
              {clientSearching ? (
                <LoadingSpinner size="sm" variant="dots" />
              ) : (
                'Buscar'
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)} disabled={clientSearching}>Nuevo</Button>
          </div>

          {clientSearching ? (
            <div className="mt-4 py-6 flex justify-center">
              <LoadingSpinner size="md" text="Buscando clientes..." variant="dots" />
            </div>
          ) : selectedClient ? (
            <div className="mt-3 rounded-xl bg-secondary/10 border border-border p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{selectedClient.nombre}</p>
                <p className="text-xs text-muted-foreground">{selectedClient.email ?? ''} · {selectedClient.telefono ?? ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => { setSelectedClient(GENERIC_CLIENT); setOrder((o) => o ? { ...o, cliente_id: null } : o); }}>Quitar</Button>
              </div>
            </div>
          ) : (
            clientResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {clientResults.map((c: any) => (
                  <button key={c.id} onClick={async () => { 
                    setSelectedClient(c); 
                    setOrder((o) => o ? { ...o, cliente_id: c.id } : o); 
                    setClientResults([]); 
                    setClientQuery('');
                    
                    // Asignar cliente a comanda inmediatamente en la BD
                    try {
                      const updateResponse = await apiClient.actualizarComanda(order!.id, { cliente_id: c.id });
                    } catch (err) {
                      console.error("❌ Error al asignar cliente en BD:", err);
                    }
                  }} className="w-full text-left rounded-xl bg-secondary p-3">
                    <p className="text-sm font-medium">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground">{c.email ?? ''} · {c.telefono ?? ''}</p>
                  </button>
                ))}
              </div>
            )
          )}
        </section>

        {/* Dialogo: crear cliente rapido */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => setCreateDialogOpen(open)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear cliente</DialogTitle>
              <DialogDescription>Crear un cliente rápido para adjuntar al ticket.</DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Input placeholder="Nombre" value={newNombre} onChange={(e) => setNewNombre(e.target.value)} />
              <Input placeholder="Apellido" value={newApellido} onChange={(e) => setNewApellido(e.target.value)} />
              <Input placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <Input placeholder="Teléfono" value={newTelefono} onChange={(e) => setNewTelefono(e.target.value)} />
            </div>

            <DialogFooter className="mt-4">
              <DialogClose asChild><Button variant="ghost" disabled={creatingClient}>Cancelar</Button></DialogClose>
              <Button onClick={() => void createClient()} disabled={creatingClient}>
                {creatingClient ? (
                  <>
                    <LoadingSpinner size="sm" variant="dots" />
                    <span>Creando...</span>
                  </>
                ) : (
                  'Crear y asignar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
          <p className="text-xs font-medium mb-2 uppercase tracking-wide text-muted-foreground">Método de pago</p>
          <div className="grid grid-cols-3 gap-1.5">
            {paymentOptions.map((option) => (
              <MethodBtn
                key={option.id}
                id={option.id}
                current={method}
                setCurrent={setMethod}
                icon={option.icon}
                label={option.label}
                description={option.description}
                accent={option.accent}
                soft={option.soft}
              />
            ))}
          </div>

          {method === "efectivo" && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Monto recibido</label>
                <input
                  inputMode="numeric"
                  value={received}
                  onChange={(e) => setReceived(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="0"
                  className="mt-1.5 w-full h-12 rounded-xl bg-secondary border-0 px-4 text-lg font-display outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {quick.map((q) => (
                  <button key={q} onClick={() => setReceived(String(q))} className="rounded-lg bg-secondary py-2 text-xs font-medium hover:bg-secondary/80">
                    ₡ {q.toLocaleString("es-CR")}
                  </button>
                ))}
              </div>
              {received && (
                <div className="rounded-xl bg-success/10 border border-success/30 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-success font-medium">Vuelto</span>
                  <span className="font-display text-lg text-success">{formatCRC(change)}</span>
                </div>
              )}
            </div>
          )}

          {method === "tarjeta" && (
            <p className="mt-4 text-sm text-muted-foreground rounded-xl bg-secondary p-4">
              Pasar tarjeta en la terminal Verifone V200c. Esperar confirmación.
            </p>
          )}
          {method === "sinpe" && (
            <div className="mt-4 rounded-xl bg-secondary p-4">
              <p className="text-sm">Pago a <span className="font-semibold">{settings.phone}</span></p>
              <p className="text-xs text-muted-foreground mt-1">{settings.businessName} · Confirmar referencia recibida</p>
            </div>
          )}

          <div className="mt-5">
            <Button onClick={() => void finish()} disabled={loading || saving || !order} className="h-11 w-full rounded-full bg-emerald-600 text-white shadow-float font-semibold text-sm hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? (
                <>
                  <LoadingSpinner size="sm" variant="spin" />
                  <span>Procesando pago...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Cobrar</span>
                </>
              )}
            </Button>
          </div>
        </section>

        {/* Pagos realizados */}
        <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
          <p className="text-sm font-medium mb-3">Pagos</p>
          {pagos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay pagos registrados</p>
          ) : (
            <ul className="space-y-2">
              {pagos.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl bg-secondary/10 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{p.tipo_pago ?? 'Pago' } • {p.referencia_pago ? p.referencia_pago : ''}</p>
                    <p className="text-xs text-muted-foreground">{p.notas ?? ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCRC(Number(p.monto || 0))}</p>
                    <p className="text-xs text-muted-foreground">{p.fecha_pago ? new Date(p.fecha_pago).toLocaleString('es-CR') : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </>
  );
}

function MethodBtn({ id, current, setCurrent, icon: Icon, label, description, accent, soft }: { id: Method; current: Method; setCurrent: (m: Method) => void; icon: typeof Banknote; label: string; description: string; accent: string; soft: string }) {
  const active = current === id;
  return (
    <button
      onClick={() => setCurrent(id)}
      className={cn(
        "group relative overflow-hidden rounded-lg border px-2.5 py-2 text-left transition-all duration-200 hover:shadow-soft min-h-[60px]",
        active
          ? `bg-white shadow-md ring-1.5 ${accent} scale-[1.01]`
          : `bg-secondary/30 border-border hover:bg-secondary/40`
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition", active ? accent + " " + soft : "bg-card text-foreground border-border group-hover:border-primary/30") }>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-semibold block leading-tight">{label}</span>
          <span className="text-[10px] text-muted-foreground line-clamp-1">{description}</span>
        </div>
      </div>
    </button>
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

/* ───── Split por items / clientes ───── */
type SplitByItemsDialogProps = { items: OrderItem[]; service: number; tax: number; orderId?: number | null; onDone?: (orderId?: number | null) => void };

const SplitByItemsDialog = ({ items, service, tax, orderId, onDone }: SplitByItemsDialogProps) => {
  // Each unit (qty expanded) gets assigned to a client index
  type Unit = { itemId: number; unit: number; price: number; name: string };
  const units: Unit[] = useMemo(
    () => items.flatMap((i) => Array.from({ length: i.qty }, (_, k) => ({ itemId: i.id, unit: k, price: i.price, name: i.name }))),
    [items]
  );
  const [clients, setClients] = useState<string[]>(["Cliente 1", "Cliente 2"]);
  const [assign, setAssign] = useState<Record<string, number>>(() => Object.fromEntries(units.map((u) => [`${u.itemId}-${u.unit}`, 0])));

  const totalSubtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const factor = totalSubtotal > 0 ? (service + tax) / totalSubtotal : 0;

  const totalsByClient = clients.map((_, idx) => {
    const sub = units.filter((u) => assign[`${u.itemId}-${u.unit}`] === idx).reduce((s, u) => s + u.price, 0);
    const charges = Math.round(sub * factor);
    return { sub, charges, total: sub + charges };
  });

  const [creatingSubcuentas, setCreatingSubcuentas] = useState(false);

  const generateSubcuentas = async () => {
    if (!orderId) {
      toast.error("Comanda no disponible para generar subcuentas");
      return;
    }
    setCreatingSubcuentas(true);
    try {
      const results: any[] = [];
      for (let i = 0; i < clients.length; i++) {
        const amt = totalsByClient[i]?.total ?? 0;
        if (!amt || amt <= 0) continue;
        try {
          const payload = {
            comanda_id: Number(orderId),
            monto: amt,
            tipo_pago: "efectivo",
            notas: `Subcuenta: ${clients[i]}`,
          };
          const res = await apiClient.registrarPago(payload);
          results.push(res?.data ?? res);
        } catch (err) {
          console.error("Error creando subcuenta:", err);
          // continuar con las siguientes
        }
      }

      if (results.length === 0) {
        toast.error("No se crearon subcuentas");
      } else {
        toast.success(`Subcuentas creadas (${results.length})`);

        // Refrescar pagos y comanda y actualizar UI en memoria
        try {
          const pagosRes = await apiClient.obtenerPagosComanda(orderId);
          const pagosData = pagosRes?.data ?? pagosRes;
          const pagosList = Array.isArray(pagosData?.pagos) ? pagosData.pagos : pagosData?.pagos ?? [];
          if (onDone) onDone(orderId);
          const totalPagado = Number(pagosData?.total_pagado ?? 0);
        } catch (err) {
          console.warn("No se pudo obtener pagos de comanda:", err);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creando subcuentas");
    } finally {
      setCreatingSubcuentas(false);
    }
  };

  const setUnitClient = (key: string, idx: number) => setAssign((a) => ({ ...a, [key]: idx }));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="rounded-xl bg-secondary py-2.5 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-secondary/80">
          <Users className="h-4 w-4" /> Dividir por items
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Dividir cuenta por cliente</DialogTitle>
          <DialogDescription>Asigna cada plato al cliente que lo pidió.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {clients.map((c, i) => (
            <div key={i} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <Input
                className="h-6 w-28 border-0 bg-transparent text-xs px-1 focus-visible:ring-0"
                value={c}
                onChange={(e) => setClients((cs) => cs.map((x, j) => (j === i ? e.target.value : x)))}
              />
              {clients.length > 2 && (
                <button onClick={() => {
                  setClients((cs) => cs.filter((_, j) => j !== i));
                  setAssign((a) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v >= i ? Math.max(0, v - 1) : v])));
                }} className="text-muted-foreground hover:text-destructive">
                  <Minus className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {clients.length < 8 && (
            <button onClick={() => setClients((cs) => [...cs, `Cliente ${cs.length + 1}`])} className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs px-3 py-1.5">
              <Plus className="h-3 w-3" /> Agregar cliente
            </button>
          )}
        </div>

        <div className="space-y-2">
          {units.map((u) => {
            const key = `${u.itemId}-${u.unit}`;
            return (
              <div key={key} className="rounded-xl bg-secondary/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCRC(u.price)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {clients.map((c, idx) => {
                    const active = assign[key] === idx;
                    return (
                      <button key={idx} onClick={() => setUnitClient(key, idx)} className={cn("text-[11px] px-2.5 py-1 rounded-full border transition", active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-secondary")}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {clients.map((c, i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{c}</p>
              <p className="font-display text-xl mt-0.5">{formatCRC(totalsByClient[i].total)}</p>
              <p className="text-[10px] text-muted-foreground">Sub {formatCRC(totalsByClient[i].sub)} + cargos {formatCRC(totalsByClient[i].charges)}</p>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-2">
          <DialogClose asChild><Button variant="ghost">Cerrar</Button></DialogClose>
          <Button onClick={() => void generateSubcuentas()} disabled={creatingSubcuentas}>
            {creatingSubcuentas ? "Generando…" : `Generar subcuentas (${clients.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Vista previa de ticket personalizado ───── */
function PreviewTicketDialog({ items, subtotal, service, tax, total, orderId, client, mesa, waiter }: { items: OrderItem[]; subtotal: number; service: number; tax: number; total: number; orderId: string; client?: any; mesa?: any; waiter?: string; }) {
  const [settings] = useTicketSettings();
  const accent = settings.accent === "verde" ? "border-primary" : settings.accent === "tierra" ? "border-accent" : "border-border";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="rounded-xl bg-secondary py-2.5 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-secondary/80">
          <Receipt className="h-4 w-4" /> Vista de ticket
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-xl">Ticket · {orderId}</DialogTitle>
            {waiter && <div className="text-sm text-neutral-600">Atendió: {waiter}</div>}
          </div>
          <DialogDescription>Configurable desde Ajustes → Personalizar ticket.</DialogDescription>
        </DialogHeader>
        <div className={cn("mx-auto w-full max-w-[280px] bg-white text-neutral-900 px-4 py-5 font-mono text-[12px] border-t-4", accent)} style={{ boxShadow: "0 1px 2px rgba(0,0,0,.1)" }}>
          {settings.showLogo && <p className="text-center text-2xl font-bold tracking-tight">{settings.businessName}</p>}
          <p className="text-center text-[10px] text-neutral-500 mt-0.5">{settings.tagline}</p>
          {client && (
            <div className="mt-2 text-[12px]">
              <p className="font-medium">{client.nombre}</p>
              {client.cedula && <p className="text-[11px] text-neutral-500">Cédula: {client.cedula}</p>}
              {client.email && <p className="text-[11px] text-neutral-500">{client.email}</p>}
              {client.telefono && <p className="text-[11px] text-neutral-500">Tel: {client.telefono}</p>}
            </div>
          )}
          {mesa && (
            <div className="mt-1 text-[11px] text-neutral-600">Mesa: {mesa.numero ?? mesa.nombre ?? mesa.id}</div>
          )}
          {waiter && (
            <div className="mt-1 text-[11px] text-neutral-600">Atendió: {waiter}</div>
          )}
          <p className="text-center text-[10px] text-neutral-500">{settings.address}</p>
          <p className="text-center text-[10px] text-neutral-500">Cédula: {settings.taxId} · Tel: {settings.phone}</p>
          <div className="border-t border-dashed border-neutral-400 my-2" />
          <p>Ticket: {orderId}</p>
          <p>Fecha: {new Date().toLocaleString("es-CR")}</p>
          <div className="border-t border-dashed border-neutral-400 my-2" />
          {items.map((i) => (
            <div key={i.id} className="flex justify-between">
              <span className="truncate pr-2">{i.qty}× {i.name}</span>
              <span>{formatCRC(i.qty * i.price)}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-neutral-400 my-2" />
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCRC(subtotal)}</span></div>
          {settings.showService && <div className="flex justify-between"><span>Servicio</span><span>{formatCRC(service)}</span></div>}
          {settings.showTax && <div className="flex justify-between"><span>IVA</span><span>{formatCRC(tax)}</span></div>}
          <div className="flex justify-between font-bold text-[14px] mt-1"><span>TOTAL</span><span>{formatCRC(total)}</span></div>
          <div className="border-t border-dashed border-neutral-400 my-2" />
          {settings.showQR && <div className="mx-auto h-16 w-16 grid place-items-center bg-neutral-100 text-[8px] text-neutral-500">QR</div>}
          <p className="text-center text-[10px] mt-2">{settings.footer}</p>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cerrar</Button></DialogClose>
          <Button onClick={() => toast.success("Ticket impreso")}><Printer className="h-4 w-4 mr-1.5" /> Imprimir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
