import { useState, useEffect, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Utensils, LogIn, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { apiClient } from "@/lib/api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
};

const logoVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 15,
    },
  },
  hover: {
    scale: 1.05,
    rotate: 5,
    transition: { duration: 0.3 },
  },
};

const inputVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
  focus: {
    scale: 1.02,
    transition: { duration: 0.2 },
  },
};

const errorVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  loading: {
    opacity: 0.7,
  },
};

const successVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: -20,
    transition: { duration: 0.3 },
  },
};

const checkmarkVariants = {
  hidden: { scale: 0, rotate: -180, opacity: 0 },
  visible: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20,
      delay: 0.2,
    },
  },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.6, repeat: 2 },
  },
};

function LoginPage() {
  const login = useStore((s) => s.login);
  const modulesFor = useStore((s) => s.modulesFor);
  const currentUserId = useStore((s) => s.currentUserId);
  const token = useStore((s) => s.token);
  const authHydrated = useStore((s) => s.authHydrated);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successUser, setSuccessUser] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);

  // Si ya está autenticado, redirigir
  useEffect(() => {
    if (!authHydrated) return;
    if (currentUserId && token && !showChangePassword) {
      if (!tempUser) { // Si tempUser está definido es porque estamos en medio del flujo de cambio
        navigate({ to: "/mesas" });
      }
    }
  }, [authHydrated, currentUserId, token, navigate, showChangePassword, tempUser]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const u = await login(username, password);
      if (!u) {
        setError("Usuario o contraseña incorrecto.");
        setIsLoading(false);
        return;
      }
      
      if (u.debe_cambiar_contraseña) {
        setTempUser(u);
        setShowChangePassword(true);
        setIsLoading(false);
        return;
      }

      setSuccessUser(u.name);
      setIsSuccess(true);
      setIsLoading(false);

      const mods = modulesFor(u.role);
      const target = mods[0] ?? "mesas";
      
      // Esperar a que terminen las animaciones antes de navegar
      await new Promise(resolve => setTimeout(resolve, 2200));
      navigate({ to: `/${target}` });
    } catch (err) {
      setError("Error al conectar con el servidor.");
      setIsLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (newPassword: string) => {
    if (!tempUser) return false;
    const isNum = Number(tempUser.id);
    if (!Number.isFinite(isNum)) return false;

    try {
      const res = await apiClient.cambiarContraseña(isNum, password, newPassword);
      if (res.success) {
        // En backend se cambió. Ya podemos continuar login
        setShowChangePassword(false);
        
        setSuccessUser(tempUser.name);
        setIsSuccess(true);

        const mods = modulesFor(tempUser.role);
        const target = mods[0] ?? "mesas";
        
        // Esperar animaciones
        setTimeout(() => {
          navigate({ to: `/${target}` });
        }, 2200);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background grain relative">
      {/* Success Overlay */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              variants={successVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-card border border-border rounded-2xl p-8 md:p-12 shadow-2xl max-w-sm w-full"
            >
              <motion.div
                variants={checkmarkVariants}
                initial="hidden"
                animate="visible"
                className="mx-auto mb-4"
              >
                <motion.div
                  variants={pulseVariants}
                  animate="pulse"
                  className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto"
                >
                  <CheckCircle2 className="h-12 w-12 text-primary" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <h2 className="font-display text-2xl mb-2">¡Bienvenido!</h2>
                <p className="text-muted-foreground mb-1">{successUser}</p>
                <p className="text-sm text-muted-foreground">Cargando tu espacio...</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-6"
              >
                <div className="flex gap-1 justify-center">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-2 w-2 rounded-full bg-primary"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand panel */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-between p-8 lg:p-10 bg-gradient-to-br from-primary/15 via-background to-accent/10 border-r"
      >
        <motion.div
          variants={logoVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-lg">
            <Utensils className="h-6 w-6" />
          </div>
          <div>
            <motion.div className="font-display text-2xl" whileHover={{ x: 5 }}>
              Verde bendito
            </motion.div>
            <motion.div className="text-xs uppercase tracking-widest text-muted-foreground">
              POS Restaurante
            </motion.div>
          </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.h1 className="font-display text-5xl leading-tight mb-3" variants={itemVariants}>
            Tu cocina,
            <br />
            en perfecta sincronía.
          </motion.h1>
          <motion.p className="text-muted-foreground max-w-md" variants={itemVariants}>
            Controla mesas, cocina, caja e inventario desde un solo punto de venta diseñado para el ritmo del restaurante.
          </motion.p>
        </motion.div>

        <motion.div
          className="text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          Desarrollado por Pablo Quiros
        </motion.div>
      </motion.div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-4 sm:p-6 md:p-10 bg-background min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20,
            delay: 0.1,
          }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <motion.div
            className="lg:hidden flex items-center gap-3 mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
          >
            <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Utensils className="h-5 w-5" />
            </div>
            <div className="font-display text-xl">Verde bendito</div>
          </motion.div>

          {/* Header */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-8"
          >
            <motion.h2 className="font-display text-2xl sm:text-3xl mb-1" variants={itemVariants}>
              Iniciar sesión
            </motion.h2>
            <motion.p className="text-xs sm:text-sm text-muted-foreground" variants={itemVariants}>
              Ingresa tu usuario y contraseña
            </motion.p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Username Input */}
            <motion.div variants={inputVariants}>
              <label className="text-xs font-medium text-muted-foreground">Usuario</label>
              <motion.div whileHover={{ scale: 1.01 }} whileFocus={{ scale: 1.02 }}>
                <Input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingrese su usuario"
                  className="h-11 mt-1 transition-all"
                  disabled={isLoading}
                />
              </motion.div>
            </motion.div>

            {/* Password Input */}
            <motion.div variants={inputVariants}>
              <label className="text-xs font-medium text-muted-foreground">Contraseña</label>
              <motion.div whileHover={{ scale: 1.01 }} whileFocus={{ scale: 1.02 }}>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="h-11 mt-1 transition-all"
                  disabled={isLoading}
                />
              </motion.div>
            </motion.div>

            {/* Error Message */}
            {error && (
              <motion.div
                variants={errorVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2.5"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.div
              variants={itemVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 relative overflow-hidden"
                disabled={isLoading}
              >
                <motion.div
                  className="flex items-center justify-center gap-2"
                  animate={isLoading ? "loading" : "idle"}
                  variants={buttonVariants}
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="h-4 w-4" />
                      </motion.div>
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>Entrar</span>
                    </>
                  )}
                </motion.div>
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </div>

      {showChangePassword && tempUser && (
        <ChangePasswordModal
          open={showChangePassword}
          username={tempUser.username}
          onChangePassword={handleChangePasswordSubmit}
          onClose={() => {
            setShowChangePassword(false);
            setTempUser(null);
            setIsLoading(false);
          }}
        />
      )}
    </div>
  );
}
