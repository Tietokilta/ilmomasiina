import React, { useCallback } from "react";

import { Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { loginToast } from "../../modules/auth";
import useStore from "../../modules/store";
import paths from "../../paths";

export default function Logout() {
  const { loggedIn, resetAuth } = useStore((state) => state.auth);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const logout = useCallback(() => {
    resetAuth();
    loginToast("success", t("auth.logoutSuccess"), 2000);
    navigate(paths.adminLogin);
  }, [resetAuth, navigate, t]);

  return loggedIn ? <Button onClick={logout}>{t("header.logout")}</Button> : null;
}
