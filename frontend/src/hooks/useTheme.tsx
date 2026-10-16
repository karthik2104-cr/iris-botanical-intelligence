import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function initialTheme(): Theme {
  const stored = localStorage.getItem("iris-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("iris-theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#141C19" : "#F7F5ED");
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

export function useChartTheme() {
  const { theme } = useTheme();
  if (theme === "dark") {
    return {
      grid: "#31443C",
      axis: "#C5D1C8",
      tooltipBg: "#1B2622",
      tooltipBorder: "#31443C",
      ink: "#F7F5ED",
      accent: "#7DAB8A",
      highlight: "#D39274",
      mutedBar: "#31443C",
    };
  }
  return {
    grid: "#D5DFD2",
    axis: "#4A5C54",
    tooltipBg: "#FFFFFF",
    tooltipBorder: "#D5DFD2",
    ink: "#202923",
    accent: "#39785B",
    highlight: "#C77B59",
    mutedBar: "#DCE8D8",
  };
}
