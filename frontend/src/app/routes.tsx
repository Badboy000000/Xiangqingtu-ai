import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { HomePage } from "./pages/HomePage";
import { AuthPage } from "./pages/auth/AuthPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

const CanvasPage = lazy(() => import("./pages/CanvasPage").then(m => ({ default: m.CanvasPage })));
const ExportPage = lazy(() => import("./pages/ExportPage").then(m => ({ default: m.ExportPage })));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage").then(m => ({ default: m.ProjectsPage })));
const TrashPage = lazy(() => import("./pages/TrashPage").then(m => ({ default: m.TrashPage })));

function Loading() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'PingFang SC', sans-serif", color: "rgba(30,20,32,0.4)", fontSize: "14px" }}>
      加载中…
    </div>
  );
}

function LazyWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomePage,
  },
  {
    path: "/auth",
    Component: AuthPage,
  },
  {
    path: "/canvas",
    Component: () => (
      <ProtectedRoute>
        <LazyWrap><CanvasPage /></LazyWrap>
      </ProtectedRoute>
    ),
  },
  {
    path: "/export",
    Component: () => (
      <ProtectedRoute>
        <LazyWrap><ExportPage /></LazyWrap>
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects",
    Component: () => (
      <ProtectedRoute>
        <LazyWrap><ProjectsPage /></LazyWrap>
      </ProtectedRoute>
    ),
  },
  {
    path: "/trash",
    Component: () => (
      <ProtectedRoute>
        <LazyWrap><TrashPage /></LazyWrap>
      </ProtectedRoute>
    ),
  },
]);
