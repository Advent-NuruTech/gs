"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallResult = "accepted" | "dismissed" | "instructions" | "error";

interface InstallContextValue {
  installed: boolean;
  installing: boolean;
  install: () => Promise<InstallResult>;
}

const InstallContext = createContext<InstallContextValue | null>(null);

export function InstallProvider({ children }: { children: ReactNode }) {
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const busyRef = useRef(false);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () => setInstalled(displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as InstallPromptEvent;
    };
    const onInstalled = () => {
      promptRef.current = null;
      setInstalled(true);
    };
    updateInstalled();
    displayMode.addEventListener("change", updateInstalled);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      displayMode.removeEventListener("change", updateInstalled);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async (): Promise<InstallResult> => {
    if (busyRef.current) return "dismissed";
    const prompt = promptRef.current;
    if (!prompt) return "instructions";
    busyRef.current = true;
    setInstalling(true);
    promptRef.current = null;
    try {
      await prompt.prompt();
      return (await prompt.userChoice).outcome;
    } catch {
      return "error";
    } finally {
      busyRef.current = false;
      setInstalling(false);
    }
  };

  return <InstallContext.Provider value={{ installed, installing, install }}>{children}</InstallContext.Provider>;
}

export function useInstall() {
  const context = useContext(InstallContext);
  if (!context) throw new Error("useInstall must be used within InstallProvider");
  return context;
}
