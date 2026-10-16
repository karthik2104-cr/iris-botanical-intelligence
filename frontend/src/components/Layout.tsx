import { Flower2, Moon, Sun } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAnalytics } from "../hooks/AnalyticsProvider";
import { useApiHealth } from "../hooks/useApiHealth";
import { useTheme } from "../hooks/useTheme";
import { apiBaseUrl } from "../services/api";

const LINKS = [
  { to: "/", label: "Overview", short: "Overview", end: true },
  { to: "/studio", label: "Classification Studio", short: "Studio", end: false },
  { to: "/atlas", label: "Species Atlas", short: "Atlas", end: false },
  { to: "/observatory", label: "Model Observatory", short: "Models", end: false },
  { to: "/notes", label: "Experiment Notes", short: "Notes", end: false },
];

function railClass(isActive: boolean) {
  return `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-ivory text-forest" : "text-[#F7F5ED] hover:bg-white/10"
  }`;
}

function mobileClass(isActive: boolean) {
  return `rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap ${
    isActive ? "bg-ivory text-forest" : "text-[#F7F5ED] hover:bg-white/10"
  }`;
}

export function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { reload } = useAnalytics();
  const { health, error, loading, refresh } = useApiHealth();
  const connected = Boolean(health && !error);
  const status = loading
    ? "Checking API"
    : error
      ? "API unavailable"
      : health?.model_available
        ? `API connected${health.model_name ? ` · ${health.model_name}` : ""}`
        : "API up, model unavailable";

  function reconnect() {
    void refresh();
    void reload();
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-paper focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <div className="lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen flex-col bg-forest text-ivory lg:flex">
          <div className="flex items-center gap-3 px-5 py-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ivory text-forest">
              <Flower2 size={18} aria-hidden="true" />
            </span>
            <span>
              <span className="block font-serif text-lg leading-none">Iris</span>
              <span className="text-xs text-[#F7F5ED]/80">Botanical Intelligence</span>
            </span>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Pages">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => railClass(isActive)}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="space-y-3 border-t border-white/15 px-4 py-4">
            <button type="button" className="flex w-full items-center gap-2 text-left text-sm" onClick={reconnect}>
              <span
                className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-botanical" : "bg-terracotta"}`}
                aria-hidden="true"
              />
              <span>
                <span className="block">{status}</span>
                <span className="block text-xs text-[#F7F5ED]/75">{apiBaseUrl()}</span>
              </span>
            </button>
            <button type="button" className="quiet-button w-full bg-ivory text-forest" onClick={toggleTheme} aria-pressed={theme === "dark"}>
              {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-20 bg-forest text-ivory lg:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-serif text-lg">Iris</span>
              <button type="button" className="rounded-md bg-ivory px-3 py-2 text-sm font-medium text-forest" onClick={toggleTheme}>
                {theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-3" aria-label="Pages">
              {LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  aria-label={link.label}
                  className={({ isActive }) => mobileClass(isActive)}
                >
                  {link.short}
                </NavLink>
              ))}
            </nav>
            <button type="button" className="px-4 pb-3 text-left text-xs text-[#F7F5ED]/80" aria-live="polite" onClick={reconnect}>
              {status} · {apiBaseUrl()}
            </button>
          </header>
          <main id="content" className="px-4 py-8 md:px-8 md:py-10">
            <Outlet />
            <footer className="mt-12 border-t border-line pt-5 text-sm leading-relaxed text-mute">
              The Iris dataset is a 150-row educational classic. A strong score here does not show that the model
              would generalize to new flowers, sensors, or species.
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
