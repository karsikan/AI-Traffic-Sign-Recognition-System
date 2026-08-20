import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * Gate for the pages that hold personal records.
 *
 * Remembers where the driver was heading so signing in returns them there rather than
 * dumping them on the home page.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="card flex flex-col items-center justify-center p-10 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-signal" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
