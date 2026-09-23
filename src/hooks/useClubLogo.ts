import { useEffect, useState } from "react";

const STORAGE_KEY = "pb_kecebong_club_logo";
export const DEFAULT_LOGO = "/logo.jpg";
const EVENT_NAME = "pb_club_logo_changed";

export function useClubLogo() {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_LOGO;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored && stored.trim() !== "" ? stored : DEFAULT_LOGO;
    } catch {
      return DEFAULT_LOGO;
    }
  });

  const isCustom = logoUrl !== DEFAULT_LOGO;

  useEffect(() => {
    function onLogoChange() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        setLogoUrl(stored && stored.trim() !== "" ? stored : DEFAULT_LOGO);
      } catch {
        setLogoUrl(DEFAULT_LOGO);
      }
    }

    window.addEventListener(EVENT_NAME, onLogoChange);
    window.addEventListener("storage", onLogoChange);
    return () => {
      window.removeEventListener(EVENT_NAME, onLogoChange);
      window.removeEventListener("storage", onLogoChange);
    };
  }, []);

  function updateLogo(dataUrl: string) {
    try {
      localStorage.setItem(STORAGE_KEY, dataUrl);
      setLogoUrl(dataUrl);
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch (e) {
      console.error("Failed to save custom logo to localStorage:", e);
      throw e;
    }
  }

  function resetLogo() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setLogoUrl(DEFAULT_LOGO);
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch (e) {
      console.error("Failed to reset custom logo:", e);
    }
  }

  return { logoUrl, isCustom, updateLogo, resetLogo };
}
