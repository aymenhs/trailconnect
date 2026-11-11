import React, { createContext, useContext, useEffect, useState } from "react";

export const textSizeOptions = ["standard", "large", "extra-large"] as const;
export type TextSize = (typeof textSizeOptions)[number];

type AccessibilityContextValue = {
  textSize: TextSize;
  setTextSize: (textSize: TextSize) => void;
};

const STORAGE_KEY = "trailconnect-text-size";
const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

function isTextSize(value: string | null): value is TextSize {
  return value !== null && textSizeOptions.includes(value as TextSize);
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSize] = useState<TextSize>(() => {
    if (typeof window === "undefined") return "standard";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isTextSize(stored) ? stored : "standard";
  });

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
    window.localStorage.setItem(STORAGE_KEY, textSize);
  }, [textSize]);

  return <AccessibilityContext.Provider value={{ textSize, setTextSize }}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return context;
}
