import { Trans, useTranslation } from "react-i18next";

import type { Event } from "../../models/event";
import Layout from "../components/Layout";
import { VerificationEmail } from "../components/shared";

export interface PaymentMailParams {
  totalFormatted: string;
  products: {
    name: string;
    amount: number;
    unitPriceFormatted: string;
  }[];
  event: Event;
  signupLink: string;
}

export default function Payment({ totalFormatted, products, event, signupLink }: PaymentMailParams) {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="content-block">
        <p className="bodyText">
          <Trans t={t} i18nKey="emails.payment.received">
            {"Your payment for "}
            <strong>{{ event: event.title }}</strong>
            {" has been received."}
          </Trans>
        </p>
      </div>
      <VerificationEmail verificationEmail={event.verificationEmail} />
      <div className="content-block">
        <p className="bodyText">{t("emails.payment.purchaseDetails")}</p>
        <table>
          <tbody>
            {products.map((product, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={index}>
                <td>{product.amount}&times;</td>
                <td>{product.name}</td>
                <td className="price">{product.unitPriceFormatted}</td>
              </tr>
            ))}
            <tr>
              <th colSpan={2}>{t("emails.payment.total")}</th>
              <th className="price">{totalFormatted}</th>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="content-block">
        <p className="bodyText">
          <Trans t={t} i18nKey="emails.payment.viewSignup">
            {"To view your signup, click "}
            <a href={signupLink}>this link</a>.
          </Trans>
        </p>
      </div>
    </Layout>
  );
}
