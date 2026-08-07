import { useParams } from "react-router-dom";
import { Printer, Copy, Clock, FileText, ChefHat, History } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { formatCRC } from "@/data/mock";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

const items = [
  { name: "Bowl de Acai Orgánico", qty: 2, price: 8500, note: "Sin granola" },
  { name: "Jugo Verde Detox", qty: 1, price: 3200 },
  { name: "Tostada de Aguacate y Huevo", qty: 1, price: 5400 },
  { name: "Café Cold Brew", qty: 2, price: 2800 },
];

const timeline = [
  { t: "10:02", e: "Comanda creada", who: "Carlos M." },
  { t: "10:04", e: "Enviada a cocina", who: "Carlos M." },
  { t: "10:09", e: "En proceso", who: "Pedro N." },
  { t: "10:21", e: "Marcada lista", who: "Pedro N." },
  { t: "10:23", e: "Servida en mesa", who: "Carlos M." },
];

export default function OrdenDetalle() {
  const { id } = useParams();
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  return (
    <>
      <PageHeader title={`Ticket ${id}`} subtitle="Mesa 04 · Juan Pérez" back />
      <div className="px-4 pb-8 space-y-4">
        <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Items</p>
            <span className="text-xs text-muted-foreground">{items.length}</span>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {items.map((it, i) => (
              <li key={i} className="py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">{it.qty}× {it.name}</p>
                    {it.note && <p className="text-xs italic text-warm-foreground mt-0.5">↳ {it.note}</p>}
                  </div>
                  <p className="text-sm font-medium">{formatCRC(it.qty * it.price)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <p className="font-display">Total</p>
            <p className="font-display text-xl">{formatCRC(total)}</p>
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
          <div className="flex items-center gap-2 mb-3">
            <ChefHat className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Línea de tiempo</p>
          </div>
          <ol className="relative border-l border-border ml-2 space-y-3">
            {timeline.map((e, i) => (
              <li key={i} className="ml-4">
                <div className="absolute -left-[5px] grid h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {e.t} · {e.who}</p>
                <p className="text-sm font-medium">{e.e}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => toast("Reimprimiendo ticket…")} className="rounded-xl bg-secondary py-3 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-secondary/80">
            <Printer className="h-4 w-4" /> Reimprimir
          </button>
          <button onClick={() => toast("Comanda duplicada")} className="rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-primary/90">
            <Copy className="h-4 w-4" /> Duplicar orden
          </button>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button className="w-full rounded-xl border border-border bg-card py-3 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-secondary">
              <FileText className="h-4 w-4" /> Ver historial de cambios
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl inline-flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Historial de cambios
              </DialogTitle>
              <DialogDescription>Registro completo de eventos del ticket.</DialogDescription>
            </DialogHeader>
            <ol className="relative border-l border-border ml-2 space-y-3 max-h-[60vh] overflow-y-auto pr-1 mt-2">
              {[
                { t: "10:02", who: "Carlos M.", text: "Comanda creada" },
                { t: "10:03", who: "Carlos M.", text: "Agregó 2× Bowl de Acai Orgánico" },
                { t: "10:03", who: "Carlos M.", text: "Agregó 1× Jugo Verde Detox" },
                { t: "10:04", who: "Carlos M.", text: "Nota: 'Sin granola' en Bowl de Acai" },
                { t: "10:04", who: "Carlos M.", text: "Enviada a cocina" },
                { t: "10:09", who: "Pedro N.", text: "Cocina · En proceso" },
                { t: "10:21", who: "Pedro N.", text: "Cocina · Marcada lista" },
                { t: "10:23", who: "Carlos M.", text: "Servida en mesa" },
              ].map((e, i) => (
                <li key={i} className="ml-4 relative">
                  <span className="absolute -left-[17px] top-1.5 grid h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {e.t} · {e.who}
                  </p>
                  <p className="text-sm font-medium leading-tight">{e.text}</p>
                </li>
              ))}
            </ol>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
