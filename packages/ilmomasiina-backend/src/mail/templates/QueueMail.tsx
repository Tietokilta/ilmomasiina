import { useTranslation } from "react-i18next";

import type { Event } from "../../models/event";
import Layout from "../components/Layout";
import { EditLink, EventDetails } from "../components/shared";

export interface QueueMailParams {
  event: Event;
  date: string | null;
  signupLink: string;
}

export default function QueueMail({ event, date, signupLink }: QueueMailParams) {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="content-block">
        <p className="bodyText">{t("emails.queueMail.accepted", { event: event.title })}</p>
      </div>
      <EventDetails event={event} date={date} />
      <EditLink href={signupLink} />
    </Layout>
  );
}
