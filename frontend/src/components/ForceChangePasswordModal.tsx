import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/store/useStore";
import apiClient from "@/lib/api";
import { toast } from "sonner";

export default function ForceChangePasswordModal() {
  // Suscribirse directamente a currentUserId y users para evitar problemas
  // cuando `currentUser` es una función del store (mejor derivarlo aquí).
  const currentUser = useStore((s) => {
    const id = s.currentUserId;
    return s.users.find((u) => u.id === id) ?? null;
  });
  const setState = useStore((s) => s);
  const globalOpen = useStore((s) => s.forceChangePasswordModalOpen);
  const setGlobalOpen = useStore((s) => s.setForceChangePasswordModalOpen);
  const [open, setOpen] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (globalOpen || (currentUser && currentUser.debe_cambiar_contraseña)) {
      setOpen(true);
      // asegurar sincronía con el store
      if (!globalOpen) setGlobalOpen(true);
    } else {
      setOpen(false);
      if (globalOpen) setGlobalOpen(false);
    }
  }, [currentUser]);

  const handleSubmit = async () => {
    if (!newPass || newPass.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (newPass !== confirmPass) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const userId = currentUser?.id;
      if (!userId) throw new Error("No se encontró usuario");
      const res = await apiClient.cambiarPassword(Number(userId), { contraseña_actual: currentPass, contraseña_nueva: newPass });
      if (res?.success) {
        toast.success("Contraseña cambiada");
        // actualizar flag en store
        useStore.setState((state: any) => ({
          users: state.users.map((u: any) => (u.id === userId ? { ...u, debe_cambiar_contraseña: false } : u)),
          forceChangePasswordModalOpen: false,
        }));
        setGlobalOpen(false);
        setOpen(false);
      } else {
        toast.error(res?.message || "No se pudo cambiar la contraseña");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.detail || err?.message || "Error cambiando contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Actualizar contraseña</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Por seguridad tu contraseña ha sido restablecida. Debes cambiarla ahora.</p>
          <div>
            <label className="text-sm">Contraseña actual</label>
            <Input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Nueva contraseña</label>
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Confirmar contraseña</label>
            <Input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={() => {}} disabled>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
