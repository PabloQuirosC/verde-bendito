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
import { Plus, DollarSign, CreditCard, Banknote } from "lucide-react";

export const PagosPage = () => {
  const { orders, apiRegisterPayment } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [formData, setFormData] = useState({
    monto: 0,
    tipo_pago: "efectivo",
    referencia: "",
  });
  const [payments, setPayments] = useState<any[]>([]);

  const readyOrders = orders.filter(o => o.status === "listo");

  const handleRegisterPayment = async () => {
    if (!selectedOrderId) {
      alert("Selecciona una comanda");
      return;
    }

    if (formData.monto <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }

    const success = await apiRegisterPayment({
      comanda_id: parseInt(selectedOrderId),
      monto: formData.monto,
      tipo_pago: formData.tipo_pago,
      referencia: formData.referencia,
    });

    if (success) {
      setPayments([
        ...payments,
        {
          id: payments.length + 1,
          comanda_id: selectedOrderId,
          monto: formData.monto,
          tipo_pago: formData.tipo_pago,
          referencia: formData.referencia,
          fecha: new Date().toISOString(),
        },
      ]);
      setIsOpen(false);
      setSelectedOrderId("");
      setFormData({
        monto: 0,
        tipo_pago: "efectivo",
        referencia: "",
      });
    }
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const totalPayments = payments.reduce((sum, p) => sum + p.monto, 0);

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case "efectivo":
        return <Banknote className="w-4 h-4" />;
      case "tarjeta":
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case "efectivo":
        return "Efectivo";
      case "tarjeta":
        return "Tarjeta";
      case "cheque":
        return "Cheque";
      default:
        return type;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Pagos</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Pago
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
              <DialogDescription>
                Completa los detalles del pago
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Comanda</label>
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una comanda" />
                  </SelectTrigger>
                  <SelectContent>
                    {readyOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.code} - Mesa {order.tableNumber} - ${Number(order.total).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrder && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm font-medium">Total a pagar</div>
                  <div className="text-2xl font-bold text-blue-600">
                    ${Number(selectedOrder.total).toFixed(2)}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Monto</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monto: parseFloat(e.target.value),
                    })
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tipo de Pago</label>
                <Select value={formData.tipo_pago} onValueChange={(value) =>
                  setFormData({ ...formData, tipo_pago: value })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Referencia (Opcional)</label>
                <Input
                  value={formData.referencia}
                  onChange={(e) =>
                    setFormData({ ...formData, referencia: e.target.value })
                  }
                  placeholder="Ej: Número de transacción"
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
                <Button onClick={handleRegisterPayment} className="flex-1">
                  Registrar Pago
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pagos Registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total en Efectivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${Number(payments.filter(p => p.tipo_pago === "efectivo").reduce((sum, p) => sum + p.monto, 0)).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total en Tarjeta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              ${Number(payments.filter(p => p.tipo_pago === "tarjeta").reduce((sum, p) => sum + p.monto, 0)).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${Number(totalPayments).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay pagos registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comanda</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">
                        #{payment.comanda_id}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${Number(payment.monto).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {getPaymentTypeIcon(payment.tipo_pago)}
                          {getPaymentTypeLabel(payment.tipo_pago)}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.referencia || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(payment.fecha).toLocaleString("es-ES")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comandas Listas para Pago</CardTitle>
        </CardHeader>
        <CardContent>
          {readyOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay comandas listas para pago
            </div>
          ) : (
            <div className="grid gap-3">
              {readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-3 border rounded-lg flex justify-between items-center hover:bg-gray-50"
                >
                  <div>
                    <div className="font-semibold">{order.code}</div>
                    <div className="text-sm text-muted-foreground">
                      Mesa {order.tableNumber}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      ${Number(order.total).toFixed(2)}
                    </div>
                    <Badge>Lista</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PagosPage;
