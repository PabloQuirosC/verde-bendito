import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullHeight?: boolean;
  fullScreen?: boolean;
  variant?: "pulse" | "spin" | "dots";
}

export function LoadingSpinner({
  size = "md",
  text,
  fullHeight = false,
  fullScreen = false,
  variant = "spin",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const containerClasses = cn(
    "flex flex-col items-center justify-center gap-3",
    fullHeight && "min-h-64",
    fullScreen && "min-h-screen w-full"
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
        <div className={cn("flex flex-col items-center justify-center gap-3 rounded-3xl border border-border/60 bg-card/95 px-8 py-7 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.45)]") }>
          {variant === "pulse" ? (
            <div className={cn(sizeClasses[size], "rounded-full bg-gradient-to-r from-primary to-primary/60 animate-pulse")} />
          ) : variant === "dots" ? (
            <div className="flex gap-1.5 items-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-full bg-primary",
                    size === "sm" ? "w-2 h-2" : size === "md" ? "w-2.5 h-2.5" : "w-3 h-3"
                  )}
                  style={{
                    animation: `bounce 1.2s infinite ease-in-out`,
                    animationDelay: `${i * 0.16}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className={cn(sizeClasses[size], "relative")}>
              <div
                className={cn(
                  "absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/40",
                  "animate-spin"
                )}
                style={{ animationDuration: "1s" }}
              />
              <div
                className={cn(
                  "absolute inset-1 rounded-full border-2 border-transparent border-b-primary/30",
                  "animate-spin"
                )}
                style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
              />
            </div>
          )}
          <p className="text-sm font-medium text-muted-foreground">{text ?? "Cargando..."}</p>
        </div>
        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { opacity: 0.4; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={containerClasses}>
        <div
          className={cn(
            sizeClasses[size],
            "rounded-full bg-gradient-to-r from-primary to-primary/60 animate-pulse"
          )}
        />
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className={containerClasses}>
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "rounded-full bg-primary",
                size === "sm" ? "w-2 h-2" : size === "md" ? "w-2.5 h-2.5" : "w-3 h-3"
              )}
              style={{
                animation: `bounce 1.2s infinite ease-in-out`,
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { opacity: 0.4; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  // Default: spin variant
  return (
    <div className={containerClasses}>
      <div className={cn(sizeClasses[size], "relative")}>
        <div
          className={cn(
            "absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/40",
            "animate-spin"
          )}
          style={{ animationDuration: "1s" }}
        />
        <div
          className={cn(
            "absolute inset-1 rounded-full border-2 border-transparent border-b-primary/30",
            "animate-spin"
          )}
          style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
        />
      </div>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

// Skeleton loader para contenido
export function SkeletonLoader({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded-md animate-pulse"
          style={{
            width: i === lines - 1 ? "70%" : "100%",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
