import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLogout } from "../hooks/use-auth-mutations";

export function LogoutButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useLogout();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={logout.isPending}
      onClick={() =>
        logout.mutate(undefined, { onSettled: () => navigate("/login", { replace: true }) })
      }
    >
      {t("common.logout")}
    </Button>
  );
}
