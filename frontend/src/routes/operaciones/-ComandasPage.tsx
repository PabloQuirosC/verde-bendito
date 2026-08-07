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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/store/useStore";
import { Eye, Plus, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export const ComandasPage = () => {
  const navigate = useNavigate();
  const {
    orders,
    tables,
    currentUserId,
    apiLoadOrdersOpen,
    apiCreateOrder,
    loadTables,
  } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  useEffect(() => {
    const initLoad = async () => {
      await loadTables();
      await apiLoadOrdersOpen();
      setLoading(false);
    };
    initLoad();
  }, [loadTables, apiLoadOrdersOpen]);

  const handleCreateOrder = async () => {
    if (!selectedTableId) {
      alert("Selecciona una mesa");
      return;
    }

    const table = tables.find(t => t.id === selectedTableId);
    if (!table) return;

    const meseroId = Number(currentUserId);
    if (!Number.isFinite(meseroId) || meseroId <= 0) {
      alert("No se pudo identificar al mesero. Vuelve a iniciar sesión.");
      return;
    }

    const success = await apiCreateOrder({
      mesa_id: parseInt(selectedTableId),
      mesa_numero: table.number,
      usuario_mesero_id: meseroId,
      tipo_cliente: "local",
    });

    if (success) {
      setIsOpen(false);
      setSelectedTableId("");
    }
  };

  const openOrders = orders.filter(o => o.status !== "cobrado" && o.status !== "cerrada");
  const availableTables = tables.filter(t => t.status === "libre");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "borrador":
        return "secondary";
      case "pendiente":
        return "default";
      case "listo":
        return "outline";
      case "cobrado":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "borrador":
        return "Borrador";
      case "pendiente":
        return "En Cocina";
      case "listo":
        return "Listo";
      case "cobrado":
        return "Cobrado";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Cargando comandas...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Comandas</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Comanda
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Comanda</DialogTitle>
              <DialogDescription>
                Selecciona una mesa para crear una nueva comanda
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Mesa</label>
                <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una mesa" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTables.map((table) => (
                      <SelectItem key={table.id} value={table.id}>
                        Mesa {table.number} ({table.seats} personas)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateOrder} className="flex-1">
                  Crear Comanda
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Comandas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">En Borrador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {orders.filter(o => o.status === "borrador").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">En Cocina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {orders.filter(o => o.status === "pendiente").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Listas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {orders.filter(o => o.status === "listo").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comandas Abiertas</CardTitle>
        </CardHeader>
        <CardContent>
          {openOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay comandas abiertas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Mesa</TableHead>
                    <TableHead>Mesero</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-semibold">
                        {order.code}
                      </TableCell>
                      <TableCell>{order.tableNumber}</TableCell>
                      <TableCell>{order.waiterName}</TableCell>
                      <TableCell>{order.items.length}</TableCell>
                      <TableCell className="font-semibold">
                        ${Number(order.total).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            navigate({
                              to: `/comandas/${order.id}`,
                            })
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComandasPage;
