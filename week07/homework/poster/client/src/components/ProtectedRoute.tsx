import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "../api/client";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const loc = useLocation();
  if (!getToken()) {
    return (
      <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
    );
  }
  return <>{children}</>;
}
