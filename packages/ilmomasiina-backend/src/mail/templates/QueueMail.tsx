import { Trans, useTranslation } from "react-i18next";

import { SignupPaymentStatus } from "@tietokilta/ilmomasiina-models";
import type { Event } from "../../models/event";
import Layout from "../components/Layout";
import { EditLink, EventDetails, PendingPaymentWarning } from "../components/shared";

export interface QueueMailParams {
  event: Event;
  date: string | null;
  paymentStatus: SignupPaymentStatus | null;
  signupLink: string;
}

export default function QueueMail({ event, date, paymentStatus, signupLink }: QueueMailParams) {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="content-block">
        <p className="bodyText">
          <Trans t={t} i18nKey="emails.queueMail.accepted">
            {"Your signup to "}
            <strong>{{ event: event.title }}</strong>
            {" was accepted from the queue."}
          </Trans>
        </p>
      </div>
      {paymentStatus === SignupPaymentStatus.PENDING && <PendingPaymentWarning event={event} signupLink={signupLink} />}
      <EventDetails event={event} date={date} />
      <EditLink href={signupLink} />
    </Layout>
  );
}
