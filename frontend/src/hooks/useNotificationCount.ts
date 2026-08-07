import { useState, useEffect } from "react";

export function useNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      if (payload) {
        setCount((prev) => {
          const newCount = prev + 1;
          return newCount;
        });
      }
    };

    window.addEventListener("vb:notification", handleNotification as EventListener);
    
    return () => {
      window.removeEventListener("vb:notification", handleNotification as EventListener);
    };
  }, []);

  const resetCount = () => {
    setCount(0);
  };

  return { count, resetCount };
}
