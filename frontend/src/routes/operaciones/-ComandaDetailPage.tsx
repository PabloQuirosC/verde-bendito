import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
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
import {
  Plus,
  Trash2,
  SendHorizontal,
  CheckCircle,
  ArrowLeft,
  Minus,
  Plus as PlusIcon,
} from "lucide-react";

export const ComandaDetailPage = () => {
  const navigate = useNavigate();
  const { ordenId } = useParams({ from: "/comandas/$ordenId" });
  const {
    orders,
    products,
    apiAddItemToOrder,
    apiCloseOrder,
    addItem,
    removeItem,
    updateItemQty,
    setOrderStatus,
    sendToKitchen,
  } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(!orders.length);

  const order = orders.find(o => o.id === ordenId);

  useEffect(() => {
    if (!loading && !order) {
      // Redirigir si no existe la orden
      navigate({ to: "/comandas" });
    }
    setLoading(false);
  }, [order, navigate, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Cargando comanda...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="mb-4 text-muted-foreground">Comanda no encontrada</div>
          <Button onClick={() => navigate({ to: "/comandas" })}>
            Volver a Comandas
          </Button>
        </div>
      </div>
    );
  }

  const handleAddItem = async () => {
    if (!selectedProductId) {
      alert("Selecciona un producto");
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    // Primero agregamos al estado local
    addItem(order.id, {
      productId: selectedProductId,
      name: product.name,
      price: product.price,
      qty: quantity,
    });

    // Luego intentamos con la API (esto puede fallar si no está implementado completamente)
    await apiAddItemToOrder(parseInt(order.id), {
      producto_id: parseInt(selectedProductId),
      cantidad: quantity,
      precio: product.price,
    });

    setIsOpen(false);
    setSelectedProductId("");
    setQuantity(1);
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(order.id, itemId);
  };

  const handleUpdateQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(order.id, itemId);
    } else {
      updateItemQty(order.id, itemId, newQty);
    }
  };

  const handleSendToKitchen = () => {
    sendToKitchen(order.id);
  };

  const handleCloseOrder = async () => {
    const success = await apiCloseOrder(parseInt(order.id));
    if (success) {
      setOrderStatus(order.id, "cerrada");
    }
  };

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: "/comandas" })}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{order.code}</h1>
          <p className="text-muted-foreground">Mesa {order.tableNumber}</p>
        </div>
        <div className="ml-auto">
          <Badge variant={getStatusColor(order.status)}>
            {getStatusLabel(order.status)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mesero</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{order.waiterName}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Subtotal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(order.subtotal).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${Number(order.total).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ítems ({order.items.length})</CardTitle>
          {order.status === "borrador" && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Agregar Producto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Producto a Comanda</DialogTitle>
                  <DialogDescription>
                    Selecciona el producto y la cantidad
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Producto</label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ${Number(product.price).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cantidad</label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
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
                    <Button onClick={handleAddItem} className="flex-1">
                      Agregar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {order.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay ítems en esta comanda
            </div>
          ) : (
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${Number(item.price).toFixed(2)} c/u
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.status === "borrador" ? (
                      <div className="flex items-center gap-1 border rounded-lg">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-semibold">
                          {item.qty}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                        >
                          <PlusIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="font-semibold w-8 text-center">
                        {item.qty}
                      </span>
                    )}
                    <div className="font-bold w-20 text-right">
                      ${Number(item.price * item.qty).toFixed(2)}
                    </div>
                    {order.status === "borrador" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {order.status === "borrador" && order.items.length > 0 && (
        <div className="flex gap-2">
          <Button
            onClick={handleSendToKitchen}
            className="gap-2"
            size="lg"
          >
            <SendHorizontal className="w-4 h-4" />
            Enviar a Cocina
          </Button>
        </div>
      )}

      {order.status === "listo" && (
        <div className="flex gap-2">
          <Button
            onClick={handleCloseOrder}
            className="gap-2"
            size="lg"
            variant="outline"
          >
            <CheckCircle className="w-4 h-4" />
            Comanda Cobrada
          </Button>
        </div>
      )}
    </div>
  );
};

export default ComandaDetailPage;
