import path from "path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import inline from "web-resource-inliner";

import config from "../config";
import i18n from "../i18n";
import mailTransporter from "./config";
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
      (error: unknown, inlined: string) => (error ? reject(error) : resolve(inlined)),
    );
  });
}

function getLanguage(language: string | null): string {
  return language || config.defaultLanguage;
}

export default class EmailService {
  static send(to: string, subject: string, html: string) {
    const msg = {
      to,
      from: config.mailFrom,
      subject,
      html,
    };

    return mailTransporter.sendMail(msg);
  }

  static async sendConfirmationMail(to: string, language: string | null, params: ConfirmationMailParams) {
    try {
      const lng = getLanguage(language);
      const subject = i18n.t(`emails.confirmation.${params.type}.subject`, { lng, event: params.event.title });
      const html = await renderEmail(<Confirmation {...params} />, lng);
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendPaymentConfirmationMail(to: string, language: string | null, params: PaymentMailParams) {
    try {
      const lng = getLanguage(language);
      const subject = i18n.t("emails.payment.subject", { lng, event: params.event.title });
      const html = await renderEmail(<Payment {...params} />, lng);
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendNewUserMail(to: string, language: string | null, params: CredentialsMailParams) {
    try {
      const lng = getLanguage(language);
      const subject = i18n.t("emails.newUser.subject", { lng });
      const html = await renderEmail(<NewUser {...params} />, lng);
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendResetPasswordMail(to: string, language: string | null, params: CredentialsMailParams) {
    try {
      const lng = getLanguage(language);
      const subject = i18n.t("emails.resetPassword.subject", { lng });
      const html = await renderEmail(<ResetPassword {...params} />, lng);
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendPromotedFromQueueMail(to: string, language: string | null, params: QueueMailParams) {
    try {
      const lng = getLanguage(language);
      const subject = i18n.t("emails.queueMail.subject", { lng, event: params.event.title });
      const html = await renderEmail(<QueueMail {...params} />, lng);
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }
}
