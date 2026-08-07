import { useEffect, useState } from "react";

export interface TicketSettings {
  businessName: string;
  tagline: string;
  address: string;
  phone: string;
  taxId: string;
  footer: string;
  showLogo: boolean;
  showTax: boolean;
  showService: boolean;
  showQR: boolean;
  accent: "verde" | "tierra" | "neutro";
  // Hardware / conexiones
  printerName?: string | null;
  printerAddress?: string | null; // ip or usb id
  validatorEnabled?: boolean;
  validatorDevice?: string | null;
}

const DEFAULTS: TicketSettings = {
  businessName: "Verde Bendito",
  tagline: "Cocina natural · Costa Rica",
  address: "Av. Central 123, San José",
  phone: "+506 2222‑3344",
  taxId: "3‑101‑876543",
  footer: "¡Gracias por tu visita! Pura vida 🌿",
  showLogo: true,
  showTax: true,
  showService: true,
  showQR: false,
  accent: "verde",
  printerName: null,
  printerAddress: null,
  validatorEnabled: false,
  validatorDevice: null,
};

const KEY = "vb.ticketSettings";

export function loadTicketSettings(): TicketSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveTicketSettings(s: TicketSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("vb:ticket-settings"));
}

export function useTicketSettings(): [TicketSettings, (s: TicketSettings) => void] {
  const [settings, setSettings] = useState<TicketSettings>(() => loadTicketSettings());
  useEffect(() => {
    const onChange = () => setSettings(loadTicketSettings());
    window.addEventListener("vb:ticket-settings", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("vb:ticket-settings", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  const update = (s: TicketSettings) => {
    saveTicketSettings(s);
    setSettings(s);
  };
  return [settings, update];
}
