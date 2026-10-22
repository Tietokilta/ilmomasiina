import { useTranslation } from "react-i18next";

import Layout from "../components/Layout";
import { LoginLink } from "../components/shared";

export interface CredentialsMailParams {
  email: string;
  password: string;
}

export default function NewUser({ email, password }: CredentialsMailParams) {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="content-block">
        <p className="bodyText">{t("emails.newUser.created")}</p>
        <ul>
          <li>
            <strong>{t("emails.email")}:</strong> {email}
          </li>
          <li>
            <strong>{t("emails.newUser.password")}:</strong> {password}
          </li>
        </ul>
      </div>
      <LoginLink />
    </Layout>
  );
}
