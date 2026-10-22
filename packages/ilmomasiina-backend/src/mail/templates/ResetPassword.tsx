import { useTranslation } from "react-i18next";

import Layout from "../components/Layout";
import { LoginLink } from "../components/shared";
import type { CredentialsMailParams } from "./NewUser";

export default function ResetPassword({ email, password }: CredentialsMailParams) {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="content-block">
        <p className="bodyText">{t("emails.resetPassword.reset")}</p>
        <ul>
          <li>
            <strong>{t("emails.email")}:</strong> {email}
          </li>
          <li>
            <strong>{t("emails.resetPassword.newPassword")}:</strong> {password}
          </li>
        </ul>
      </div>
      <LoginLink />
    </Layout>
  );
}
