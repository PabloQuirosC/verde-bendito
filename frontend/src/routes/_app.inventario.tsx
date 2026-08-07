import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Pencil, Plus, Trash2, Tag } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { formatCRC } from "@/lib/format";
import type { CategoryDef, Product } from "@/store/types";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/Pagination";

export const Route = createFileRoute("/_app/inventario")({
  component: InventarioPage,
});

const emptyProduct = (categoryId: string): Product => ({
  id: "",
  name: "",
  category: categoryId,
  price: 0,
  stock: 0,
  minStock: 5,
  emoji: "🍽️",
  active: true,
});

function InventarioPage() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const upsert = useStore((s) => s.upsertProduct);
  const remove = useStore((s) => s.removeProduct);
  const [filter, setFilter] = useState<"todas" | string>("todas");
  const [editing, setEditing] = useState<Product | null>(null);
  const [editingCat, setEditingCat] = useState<CategoryDef | null>(null);
  const [catManager, setCatManager] = useState(false);

  const filtered = useMemo(
    () => products.filter((p) => filter === "todas" || p.category === filter),
    [products, filter],
  );
  const lowStock = products.filter((p) => p.stock <= p.minStock);

  const pag = usePagination(filtered, 4);

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} productos · {categories.length} categorías · {lowStock.length} con stock bajo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatManager(true)}>
            <Tag className="h-4 w-4 mr-1.5" /> Categorías
          </Button>
          <Button
            onClick={() =>
              setEditing({
                ...emptyProduct(categories[0]?.id ?? "principales"),
                id: Math.random().toString(36).slice(2, 8),
              })
            }
            disabled={categories.length === 0}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Nuevo producto
          </Button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="pos-card p-4 border-warning/40 bg-warning/10 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning-foreground mt-0.5 shrink-0" />
          <div className="text-sm">
            <strong>Stock bajo:</strong>{" "}
            {lowStock.map((p) => p.name).join(", ")}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("todas")}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm border",
            filter === "todas" ? "bg-primary text-primary-foreground border-primary" : "bg-card",
          )}
        >
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border",
              filter === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card",
            )}
          >
            <span className="mr-1">{c.emoji}</span>
            {c.name}
          </button>
        ))}
      </div>

      <div className="pos-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left p-3">Producto</th>
                <th className="text-left p-3 hidden md:table-cell">Categoría</th>
                <th className="text-right p-3">Precio</th>
                <th className="text-right p-3">Stock</th>
                <th className="text-right p-3 hidden sm:table-cell">Mín</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {pag.pageItems.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                  Sin productos en esta categoría.
                </td></tr>
              )}
              {pag.pageItems.map((p) => {
                const cat = categories.find((c) => c.id === p.category);
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{p.emoji}</span>
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {cat ? `${cat.emoji} ${cat.name}` : p.category}
                    </td>
                    <td className="p-3 text-right font-semibold whitespace-nowrap">{formatCRC(p.price)}</td>
                    <td className={cn("p-3 text-right font-semibold", p.stock <= p.minStock && "text-warning-foreground")}>
                      {p.stock}
                    </td>
                    <td className="p-3 text-right text-muted-foreground hidden sm:table-cell">{p.minStock}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          rangeStart={pag.rangeStart}
          rangeEnd={pag.rangeEnd}
          total={pag.total}
          onPage={pag.setPage}
        />
      </div>

      {/* Diálogo producto */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing && products.some((p) => p.id === editing.id) ? "Editar" : "Nuevo"} producto</DialogTitle>
            <DialogDescription>Detalles del producto e inventario.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="Nombre">
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Emoji">
                  <Input value={editing.emoji} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} />
                </Field>
                <Field label="Categoría">
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.emoji} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Precio (₡)">
                <Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: +e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Stock">
                  <Input type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: +e.target.value })} />
                </Field>
                <Field label="Stock mínimo">
                  <Input type="number" value={editing.minStock} onChange={(e) => setEditing({ ...editing, minStock: +e.target.value })} />
                </Field>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (editing && editing.name.trim()) {
                  upsert(editing);
                  setEditing(null);
                }
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo categorías */}
      <CategoryManager
        open={catManager}
        onOpenChange={setCatManager}
        editingCat={editingCat}
        setEditingCat={setEditingCat}
      />
    </div>
  );
}

function CategoryManager({
  open, onOpenChange, editingCat, setEditingCat,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editingCat: CategoryDef | null;
  setEditingCat: (c: CategoryDef | null) => void;
}) {
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const upsertCategory = useStore((s) => s.upsertCategory);
  const removeCategory = useStore((s) => s.removeCategory);

  const handleSave = () => {
    if (!editingCat) return;
    const id = editingCat.id || editingCat.name.toLowerCase().trim().replace(/\s+/g, "-");
    if (!id || !editingCat.name.trim()) return;
    upsertCategory({ ...editingCat, id });
    setEditingCat(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gestionar categorías</DialogTitle>
          <DialogDescription>
            Crea, edita o elimina categorías del menú.
          </DialogDescription>
        </DialogHeader>

        {editingCat ? (
          <div className="space-y-3">
            <Field label="Nombre">
              <Input
                autoFocus
                value={editingCat.name}
                placeholder="Ej. Sushi, Pizzas…"
                onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
              />
            </Field>
            <Field label="Emoji">
              <Input
                value={editingCat.emoji}
                onChange={(e) => setEditingCat({ ...editingCat, emoji: e.target.value })}
              />
            </Field>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditingCat(null)}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-[300px] overflow-auto -mx-1 px-1">
              {categories.map((c) => {
                const count = products.filter((p) => p.category === c.id).length;
                return (
                  <div key={c.id} className="flex items-center gap-3 border rounded-lg p-2.5">
                    <span className="text-2xl">{c.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{count} producto{count === 1 ? "" : "s"}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setEditingCat(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive disabled:opacity-30"
                      disabled={count > 0}
                      onClick={() => removeCategory(c.id)}
                      title={count > 0 ? "Reasigna los productos antes de borrar" : "Eliminar"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button onClick={() => setEditingCat({ id: "", name: "", emoji: "🍽️" })}>
                <Plus className="h-4 w-4 mr-1.5" /> Nueva categoría
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
