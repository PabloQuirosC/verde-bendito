import { StorageValue } from "zustand/middleware";

/**
 * Storage personalizado para Zustand que maneja SSR
 * Solo usa localStorage en el navegador, en SSR devuelve un storage vacío
 */
const isClient = typeof window !== "undefined" && typeof localStorage !== "undefined";

export const createSSRStorage = () => {
  return {
    getItem: (name: string): StorageValue | null => {
      if (!isClient) {
        return null;
      }
      try {
        const value = localStorage.getItem(name);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.warn(`Failed to get item from localStorage: ${name}`, error);
        return null;
      }
    },

    setItem: (name: string, value: StorageValue): void => {
      if (isClient) {
        try {
          localStorage.setItem(name, JSON.stringify(value));
        } catch (error) {
          console.warn(`Failed to set item in localStorage: ${name}`, error);
        }
      }
    },

    removeItem: (name: string): void => {
      if (isClient) {
        try {
          localStorage.removeItem(name);
        } catch (error) {
          console.warn(`Failed to remove item from localStorage: ${name}`, error);
        }
      }
    },
  };
};

