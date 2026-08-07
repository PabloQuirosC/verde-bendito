import { Receipt, Wifi, Save, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTicketSettings, loadTicketSettings } from "@/lib/ticketSettings";
import apiClient from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// (Se removió el bloque de grupos innecesario)

export default function AdminAjustes() {
  const [settings, setSettings] = useTicketSettings();
  const [draft, setDraft] = useState(settings);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const update = (patch: Partial<typeof settings>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    // Persistir configuración en DB
    try {
      await apiClient.updateConfiguracion({
        nombre_negocio: draft.businessName || "",
        ruc: draft.taxId || null,
        direccion: draft.address || null,
        telefono: draft.phone || null,
        email: null,
        sitio_web: null,
        moneda: "USD",
        idioma: "es",
        impuesto: 13.0,
        horario_apertura: null,
        horario_cierre: null,
        logo_url: null,
        // ticket personalization
        tagline: draft.tagline ?? null,
        footer: draft.footer ?? null,
        show_logo: draft.showLogo ? 1 : 0,
        show_tax: draft.showTax ? 1 : 0,
        show_service: draft.showService ? 1 : 0,
        show_qr: draft.showQR ? 1 : 0,
        accent: draft.accent ?? 'verde',
      });
    } catch (err) {
      console.warn("No se pudo persistir configuración en DB:", err);
      toast.error("No se pudo guardar configuración en la base de datos");
    }

    // Persistir hardware (archivo)
    try {
      await apiClient.updateHardwareSettings({
        printerName: draft.printerName,
        printerAddress: draft.printerAddress,
        validatorEnabled: draft.validatorEnabled,
        validatorDevice: draft.validatorDevice,
      });
    } catch (err) {
      console.warn("No se pudo persistir hardware en backend:", err);
      toast.error("No se pudo guardar configuración de hardware");
    }

    setSettings(draft);
    toast.success("Ticket actualizado");
  };

  const reset = async () => {
    const d = loadTicketSettings();
    setDraft(d);
    setSettings(d);
    try {
      const res = await apiClient.getHardwareSettings();
      const hw = res?.data ?? res;
      if (hw) setDraft((prev) => ({ ...prev, ...hw }));
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) setLoadingConfig(true);
      try {
        const res = await apiClient.getHardwareSettings();
        const hw = res?.data ?? res;
        if (mounted && hw) setDraft((d) => ({ ...d, ...hw }));
      } catch (err) {
        console.warn("No se pudo cargar configuración hardware:", err);
      }

      try {
        const cfg = await apiClient.getConfiguracion();
        const c = cfg?.data ?? cfg;
        if (mounted && c) {
          setDraft((d) => ({
              ...d,
              businessName: c.nombre_negocio ?? d.businessName,
              tagline: c.tagline ?? d.tagline,
              address: c.direccion ?? d.address,
              phone: c.telefono ?? d.phone,
              taxId: c.ruc ?? d.taxId,
              footer: c.footer ?? d.footer,
              showLogo: c.show_logo === undefined ? d.showLogo : !!c.show_logo,
              showTax: c.show_tax === undefined ? d.showTax : !!c.show_tax,
              showService: c.show_service === undefined ? d.showService : !!c.show_service,
              showQR: c.show_qr === undefined ? d.showQR : !!c.show_qr,
              accent: c.accent ?? d.accent,
          }));
        }
      } catch (err) {
        console.warn("No se pudo cargar configuración desde DB:", err);
      } finally {
        if (mounted) setLoadingConfig(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      <PageHeader title="Ajustes del sistema" subtitle="Verde Bendito · Sucursal Centro" home />
      <div className="px-4 lg:px-6 pb-8 space-y-5">
        {loadingConfig ? (
          <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-8">
            <LoadingSpinner size="md" variant="spin" text="Cargando ajustes..." />
          </section>
        ) : null}
        <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Estado del sistema</p>
              <p className="text-xs text-muted-foreground mt-0.5">Todos los servicios operativos</p>
            </div>
            <span className="chip bg-success/15 text-success"><Wifi className="h-3 w-3" /> Online</span>
          </div>
        </section>

        {/* Personalización del ticket */}
        <section>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1 inline-flex items-center gap-1.5"><Receipt className="h-3 w-3" /> Personalizar ticket</p>
          <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nombre comercial" value={draft.businessName} onChange={(v) => update({ businessName: v })} />
              <Field label="Lema / tagline" value={draft.tagline} onChange={(v) => update({ tagline: v })} />
              <Field label="Dirección" value={draft.address} onChange={(v) => update({ address: v })} />
              <Field label="Teléfono" value={draft.phone} onChange={(v) => update({ phone: v })} />
              <Field label="Cédula jurídica" value={draft.taxId} onChange={(v) => update({ taxId: v })} />
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Acento</Label>
                <div className="mt-1.5 flex gap-1.5">
                  {(["verde", "tierra", "neutro"] as const).map((c) => (
                    <button key={c} type="button" onClick={() => update({ accent: c })} className={cn("flex-1 rounded-lg py-2 text-xs capitalize border", draft.accent === c ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mensaje al pie</Label>
              <Textarea rows={2} value={draft.footer ?? ""} onChange={(e) => update({ footer: e.target.value })} />
            </div>

            {/* Hardware / impresora y validador */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Conexiones de hardware</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Impresora (nombre)" value={draft.printerName ?? ""} onChange={(v) => update({ printerName: v || null })} />
                <Field label="Impresora (IP / USB)" value={draft.printerAddress ?? ""} onChange={(v) => update({ printerAddress: v || null })} />
                <div>
                  <ToggleRow label="Validador habilitado" checked={!!draft.validatorEnabled} onChange={(v) => update({ validatorEnabled: v })} />
                </div>
                <Field label="Validador (device)" value={draft.validatorDevice ?? ""} onChange={(v) => update({ validatorDevice: v || null })} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" onClick={async () => {
                  try {
                    const res = await apiClient.testPrinter(draft.printerAddress);
                    if (res?.success) toast.success(res.message ?? 'Impresora conectada');
                    else toast.error(res?.message ?? 'No se pudo conectar');
                  } catch (err: any) {
                    toast.error(err?.message ?? 'Error probando impresora');
                  }
                }}>Probar impresora</Button>
                <Button variant="ghost" onClick={async () => {
                  try {
                    // Si estamos en la estación POS, preferir WebUSB / WebSerial
                    if (typeof navigator !== 'undefined' && ('usb' in navigator || 'serial' in navigator)) {
                      try {
                        if ('usb' in navigator) {
                          // @ts-ignore
                          const device = await (navigator as any).usb.requestDevice({ filters: [] });
                          const payload = { type: 'usb', vendorId: device.vendorId, productId: device.productId, serialNumber: device.serialNumber || null };
                          const resp = await apiClient.validateDevice(payload);
                          if (resp?.success) toast.success('Validador detectado y registrado');
                          else toast.error(resp?.message || 'No se detectó validador');
                        } else {
                          // WebSerial flow: request port and notify backend
                          // @ts-ignore
                          await (navigator as any).serial.requestPort();
                          const payload = { type: 'serial', info: 'serial-port-attached' };
                          const resp = await apiClient.validateDevice(payload);
                          if (resp?.success) toast.success('Puerto serial detectado y registrado');
                          else toast.error(resp?.message || 'No se detectó validador');
                        }
                        return;
                      } catch (e: any) {
                        console.warn('Error WebUSB/WebSerial:', e);
                        toast.error('Error accediendo al dispositivo desde el navegador');
                        return;
                      }
                    }

                    // Fallback: intentar el test remoto (TCP) — si falla, mostrar instrucción
                    const res = await apiClient.testValidator(draft.validatorDevice);
                    if (res?.success) toast.success(res.message ?? 'Validador conectado');
                    else {
                      toast.error(res?.message ?? 'No se pudo conectar');
                      // Si backend responde con mensaje de USB no implementado, guiar al usuario
                      if (res?.message && res.message.includes('Validación de dispositivos USB no implementada')) {
                        toast.warning('La validación USB debe realizarse desde la estación POS (usa el componente PruebaUSB o abre el admin en la POS).');
                      }
                    }
                  } catch (err: any) {
                    toast.error(err?.message ?? 'Error probando validador');
                  }
                }}>Probar validador</Button>
              </div>
            </div>

            <div className="space-y-2">
              <ToggleRow label="Mostrar logo / nombre" checked={draft.showLogo} onChange={(v) => update({ showLogo: v })} />
              <ToggleRow label="Incluir IVA (13%)" checked={draft.showTax} onChange={(v) => update({ showTax: v })} />
              <ToggleRow label="Incluir servicio (10%)" checked={draft.showService} onChange={(v) => update({ showService: v })} />
              <ToggleRow label="Mostrar QR de factura electrónica" checked={draft.showQR} onChange={(v) => update({ showQR: v })} />
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button onClick={save} className="flex-1"><Save className="h-4 w-4 mr-1.5" /> Guardar cambios</Button>
              <Button onClick={reset} variant="ghost"><RotateCcw className="h-4 w-4" /></Button>
            </div>
          </div>
        </section>

        {/* Sección 'Preferencias' removida */}

        <p className="text-[11px] text-muted-foreground text-center pt-2">Verde Bendito POS · v1.0.0</p>
      </div>
    </>
  );
}

function Field({ label, value, onChange }: { label: string; value?: string | null; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Toggle({ icon: Icon, label, desc, defaultOn }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch defaultChecked={!!defaultOn} />
    </div>
  );
}
