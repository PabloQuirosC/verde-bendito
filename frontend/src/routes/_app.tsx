import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import { AppLayout } from "@/components/AppLayout";

function ProtectedLayout() {
  const router = useRouter();
  const authHydrated = useStore((s) => s.authHydrated);
  const currentUserId = useStore((s) => s.currentUserId);
  const token = useStore((s) => s.token);
  
  // Validar autenticación después de que el estado se restaure
  useEffect(() => {
    if (!authHydrated) return;
    if (!currentUserId || !token) {
      router.navigate({ to: "/login" });
    }
  }, [authHydrated, currentUserId, token, router]);
  
  // Si no hay autenticación, no renderizar nada
  if (!authHydrated || !currentUserId || !token) {
    return null;
  }
  
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export const Route = createFileRoute("/_app")({
  component: () => <ProtectedLayout />,
});
