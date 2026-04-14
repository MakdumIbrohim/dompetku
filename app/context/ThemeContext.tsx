"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type FontFamily = "Inter" | "Roboto" | "Poppins";
type BorderRadius = "sharp" | "rounded" | "extra-rounded";

interface ThemeContextType {
  theme: Theme;
  accentColor: string;
  fontFamily: FontFamily;
  borderRadius: BorderRadius;
  toggleTheme: () => void;
  setAccentColor: (color: string) => void;
  setFontFamily: (font: FontFamily) => void;
  setBorderRadius: (radius: BorderRadius) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_ACCENT = "#5156D6";
const DEFAULT_FONT = "Inter";
const DEFAULT_RADIUS = "rounded";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [accentColor, setAccentColor] = useState<string>(DEFAULT_ACCENT);
  const [fontFamily, setFontFamily] = useState<FontFamily>(DEFAULT_FONT);
  const [borderRadius, setBorderRadius] = useState<BorderRadius>(DEFAULT_RADIUS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("dompetku_theme") as Theme | null;
    const savedAccent = localStorage.getItem("dompetku_accent_color");
    const savedFont = localStorage.getItem("dompetku_font") as FontFamily | null;
    const savedRadius = localStorage.getItem("dompetku_radius") as BorderRadius | null;

    if (savedTheme) setTheme(savedTheme);
    if (savedAccent) setAccentColor(savedAccent);
    if (savedFont) setFontFamily(savedFont);
    if (savedRadius) setBorderRadius(savedRadius);
    
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("dompetku_theme", theme);
      localStorage.setItem("dompetku_accent_color", accentColor);
      localStorage.setItem("dompetku_font", fontFamily);
      localStorage.setItem("dompetku_radius", borderRadius);

      // Inject CSS Variables
      const root = document.documentElement;
      root.style.setProperty("--green", accentColor);
      root.style.setProperty("--app-font-family", `var(--font-${fontFamily.toLowerCase()})`);
      
      // Handle Radius
      let radiusVal = "12px";
      let cardRadiusVal = "20px";
      if (borderRadius === "sharp") {
        radiusVal = "0px";
        cardRadiusVal = "0px";
      } else if (borderRadius === "extra-rounded") {
        radiusVal = "24px";
        cardRadiusVal = "32px";
      }
      root.style.setProperty("--radius-base", radiusVal);
      root.style.setProperty("--radius-card", cardRadiusVal);

      // Derived light version of accent color (for backgrounds)
      // Simple logic: add opacity or mix with white
      root.style.setProperty("--green-light", `${accentColor}1A`); // 10% opacity
      root.style.setProperty("--green-shadow", `${accentColor}29`); // ~16% opacity
    }
  }, [theme, accentColor, fontFamily, borderRadius, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const resetTheme = () => {
    setTheme("light");
    setAccentColor(DEFAULT_ACCENT);
    setFontFamily(DEFAULT_FONT);
    setBorderRadius(DEFAULT_RADIUS);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      accentColor, 
      fontFamily, 
      borderRadius, 
      toggleTheme, 
      setAccentColor, 
      setFontFamily, 
      setBorderRadius,
      resetTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
