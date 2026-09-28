import { createEvent } from "ics";
import path from "path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import inline from "web-resource-inliner";

import config from "../config";
import i18n from "../i18n";
import type { Event } from "../models/event";
import { icsAttrsFromEvent, isICalExportable } from "../routes/ical";
import { getStripMarkdownProcessor } from "../util/stripMarkdown";
import mailTransporter, { AbstractMailAttachment } from "./config";
import Confirmation, { ConfirmationMailParams } from "./templates/Confirmation";
import NewUser, { CredentialsMailParams } from "./templates/NewUser";
import Payment, { PaymentMailParams } from "./templates/Payment";
import QueueMail, { QueueMailParams } from "./templates/QueueMail";
import ResetPassword from "./templates/ResetPassword";

export type { ConfirmationMailParams, CredentialsMailParams, PaymentMailParams, QueueMailParams };

const assetsDir = path.resolve(__dirname, "../../emails");

const DOCTYPE =
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

async function renderEmail(element: ReactElement, language: string): Promise<string> {
  const i18nInstance = i18n.cloneInstance({ lng: language });

  const wrapped = <I18nextProvider i18n={i18nInstance}>{element}</I18nextProvider>;
  const html = renderToStaticMarkup(wrapped);
  const withDoctype = `${DOCTYPE}\n${html}`;

  // Skip resource inlining for console transport (keeps output readable)
  if (mailTransporter.transporter.name === "console fallback") {
    return withDoctype;
  }
  return new Promise((resolve, reject) => {
    inline.html(
      {
        fileContent: withDoctype,
        relativeTo: assetsDir,
        strict: true,
      },
      (error: Error | null, inlined: string) => (error ? reject(error) : resolve(inlined)),
    );
  });
}

function getLanguage(language: string | null): string {
  return language || config.defaultLanguage;
}

/** Creates an invite.ics attachment for the event, or returns null if the event lacks a start or end date. */
async function createICalAttachment(event: Event): Promise<AbstractMailAttachment | null> {
  if (!isICalExportable(event)) return null;

  const stripMarkdown = await getStripMarkdownProcessor();
  const { error, value } = createEvent({
    ...icsAttrsFromEvent(event, stripMarkdown(event.description || "")),
    method: "PUBLISH",
  });
  if (error || !value) {
    // Don't prevent sending the email if the invite fails to generate.
    console.error("Failed to generate iCalendar attachment:", error);
    return null;
  }

  return {
    filename: "invite.ics",
    content: value,
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
  };
}

const EmailService = {
  send(to: string, subject: string, html: string, attachments?: AbstractMailAttachment[]) {
    const msg = {
      to,
      from: config.mailFrom,
      subject,
      html,
      attachments,
    };

    return mailTransporter.sendMail(msg);
  },

  sendConfirmationMail: async (to: string, language: string | null, params: ConfirmationMailParams) => {
    try {
      const lng = getLanguage(language);
      const subject = i18n.t(`emails.confirmation.${params.type}.subject`, { lng, event: params.event.title });
      const html = await renderEmail(<Confirmation {...params} />, lng);
      const icalAttachment = await createICalAttachment(params.event);
      await EmailService.send(to, subject, html, icalAttachment ? [icalAttachment] : undefined);
    } catch (error) {
      console.error(error);
    }
  },

  sendPaymentConfirmationMail: async (to: string, language: string | null, params: PaymentMailParams) => {
    try {
      const lng = getLanguage(language);
      const subject = i18n.t("emails.payment.subject", { lng, event: params.event.title });
      const html = await renderEmail(<Payment {...params} />, lng);
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  },

  sendNewUserMail: async (to: string, language: string | null, params: CredentialsMailParams) => {
    try {
      const lng = getLanguage(language);
      const subject = i18n.t("emails.newUser.subject", { lng });
      const html = await renderEmail(<NewUser {...params} />, lng);
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  },

  sendResetPasswordMail: async (to: string, language: string | null, params: CredentialsMailParams) => {
    try {
      const lng = getLanguage(language);
      const subject = i18n.t("emails.resetPassword.subject", { lng });
      const html = await renderEmail(<ResetPassword {...params} />, lng);
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  },

  sendPromotedFromQueueMail: async (to: string, language: string | null, params: QueueMailParams) => {
    try {
      const lng = getLanguage(language);
      const subject = i18n.t("emails.queueMail.subject", { lng, event: params.event.title });
      const html = await renderEmail(<QueueMail {...params} />, lng);
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  },
};

export default EmailService;
