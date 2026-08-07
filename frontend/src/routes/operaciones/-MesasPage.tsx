import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/store/useStore";
import { Edit, Trash2, Plus } from "lucide-react";

export const MesasPage = () => {
  const { tables, loadTables, apiCreateTable, apiUpdateTable } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    numero: 0,
    capacidad: 4,
    estado: "disponible",
  });

  useEffect(() => {
    const initLoad = async () => {
      await loadTables();
      setLoading(false);
    };
    initLoad();
  }, [loadTables]);

  const handleOpenDialog = (table?: (typeof tables)[0]) => {
    if (table) {
      setEditingId(table.id);
      setFormData({
        numero: table.number,
        capacidad: table.capacity,
        estado: table.status === "libre" ? "disponible" : "ocupada",
      });
    } else {
      setEditingId(null);
      const maxNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) : 0;
      setFormData({
        numero: maxNumber + 1,
        capacidad: 4,
        estado: "disponible",
      });
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!formData.numero) {
      alert("El número de mesa es requerido");
      return;
    }

    const success = editingId
      ? await apiUpdateTable(parseInt(editingId), formData)
      : await apiCreateTable(formData);

    if (success) {
      setIsOpen(false);
      setFormData({
        numero: 0,
        capacidad: 4,
        estado: "disponible",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Cargando mesas...</div>
      </div>
    );
  }

  const availableTables = tables.filter(t => t.status === "libre");
  const occupiedTables = tables.filter(t => t.status === "ocupada");

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Mesas</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Mesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Mes a" : "Nueva Mesa"}
              </DialogTitle>
              <DialogDescription>
                Completa los detalles de la mesa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Número</label>
                <Input
                  type="number"
                  value={formData.numero}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numero: parseInt(e.target.value),
                    })
                  }
                  placeholder="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Capacidad</label>
                <Input
                  type="number"
                  value={formData.capacidad}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacidad: parseInt(e.target.value),
                    })
                  }
                  placeholder="4"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="flex-1">
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Mesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tables.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{availableTables.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ocupadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{occupiedTables.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mesas Disponibles */}
        <Card>
          <CardHeader>
            <CardTitle>Mesas Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {availableTables.map((table) => (
                <div
                  key={table.id}
                  className="p-4 border rounded-lg text-center hover:bg-green-50 cursor-pointer transition"
                >
                  <div className="text-2xl font-bold">{table.number}</div>
                  <div className="text-xs text-muted-foreground">
                    {table.capacity} personas
                  </div>
                  <div className="mt-2 space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(table)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mesas Ocupadas */}
        <Card>
          <CardHeader>
            <CardTitle>Mesas Ocupadas</CardTitle>
          </CardHeader>
          <CardContent>
            {occupiedTables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay mesas ocupadas
              </div>
            ) : (
              <div className="space-y-3">
                {occupiedTables.map((table) => (
                  <div
                    key={table.id}
                    className="p-3 border rounded-lg bg-orange-50 hover:bg-orange-100 transition"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">Mesa {table.number}</div>
                        <div className="text-sm text-muted-foreground">
                          Capacidad: {table.capacity} personas
                        </div>
                      </div>
                      <Badge variant="secondary">Ocupada</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MesasPage;
