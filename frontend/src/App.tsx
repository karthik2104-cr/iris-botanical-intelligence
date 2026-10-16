import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AnalyticsProvider } from "./hooks/AnalyticsProvider";
import { ThemeProvider } from "./hooks/useTheme";

const OverviewPage = lazy(() => import("./pages/OverviewPage").then((module) => ({ default: module.OverviewPage })));
const StudioPage = lazy(() => import("./pages/StudioPage").then((module) => ({ default: module.StudioPage })));
const AtlasPage = lazy(() => import("./pages/AtlasPage").then((module) => ({ default: module.AtlasPage })));
const ObservatoryPage = lazy(() =>
  import("./pages/ObservatoryPage").then((module) => ({ default: module.ObservatoryPage })),
);
const NotesPage = lazy(() => import("./pages/NotesPage").then((module) => ({ default: module.NotesPage })));

function PageFallback() {
  return (
    <section className="panel mx-auto max-w-xl p-8 text-center" role="status">
      <h2 className="font-serif text-3xl text-ink">Loading page</h2>
      <p className="mt-3 text-sm leading-relaxed text-mute">The next section of the dashboard is loading.</p>
    </section>
  );
}

function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AnalyticsProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Page><OverviewPage /></Page>} />
              <Route path="studio" element={<Page><StudioPage /></Page>} />
              <Route path="atlas" element={<Page><AtlasPage /></Page>} />
              <Route path="observatory" element={<Page><ObservatoryPage /></Page>} />
              <Route path="notes" element={<Page><NotesPage /></Page>} />
              <Route path="predict" element={<Navigate to="/studio" replace />} />
              <Route path="evaluation" element={<Navigate to="/observatory" replace />} />
              <Route path="explorer" element={<Navigate to="/atlas" replace />} />
              <Route path="learn" element={<Navigate to="/notes" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AnalyticsProvider>
    </ThemeProvider>
  );
}
