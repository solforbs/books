import { Navigate, Route, Routes } from "react-router";
import { PublicOnly, RequireSession } from "@/features/auth/components/route-guards";
import { ChangePasswordPage } from "@/features/auth/pages/change-password-page";
import { ChooseBusinessPage } from "@/features/auth/pages/choose-business-page";
import { HomePage } from "@/features/auth/pages/home-page";
import { LoginPage } from "@/features/auth/pages/login-page";
import { RecoverPage } from "@/features/auth/pages/recover-page";
import { RegisterPage } from "@/features/auth/pages/register-page";

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route
        path="/recover"
        element={
          <PublicOnly>
            <RecoverPage />
          </PublicOnly>
        }
      />
      <Route
        path="/change-password"
        element={
          <RequireSession step="change-password">
            <ChangePasswordPage />
          </RequireSession>
        }
      />
      <Route
        path="/choose-business"
        element={
          <RequireSession step="choose-business">
            <ChooseBusinessPage />
          </RequireSession>
        }
      />
      <Route
        path="/"
        element={
          <RequireSession step="home">
            <HomePage />
          </RequireSession>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
