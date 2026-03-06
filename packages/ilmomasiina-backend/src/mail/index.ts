import Email from "email-templates";
import { existsSync } from "fs";
import i18next from "i18next";
import path from "path";

import { SignupPaymentStatus } from "@tietokilta/ilmomasiina-models";
import config, { adminUrl } from "../config";
import i18n from "../i18n";
import { Event } from "../models/event";
import mailTransporter from "./config";

export interface ConfirmationMailParams {
  name: string;
  email: string;
  quota: string;
  answers: {
    label: string;
    answer: string;
  }[];
  queuePosition: number | null;
  type: "signup" | "edit";
  admin: boolean;
  date: string | null;
  event: Event;
  paymentStatus: SignupPaymentStatus | null;
  cancelLink: string;
}

export interface PaymentMailParams {
  totalFormatted: string;
  currency: string;
  products: {
    name: string;
    amount: number;
    unitPriceFormatted: string;
  }[];
  event: Event;
  cancelLink: string;
}

export interface NewUserMailParams {
  email: string;
  password: string;
}

export interface PromotedFromQueueMailParams {
  event: Event;
  date: string | null;
  paymentStatus: SignupPaymentStatus | null;
  cancelLink: string;
}

const TEMPLATE_DIR = path.join(__dirname, "../../emails");

/** Gets a localized template for the given language, or a fallback one if it doesn't exist. */
function getTemplate(language: string | null, template: string) {
  const lng = language || config.defaultLanguage;
  // ensure no path injections
  if (!/^[a-zA-Z-]{2,}$/.test(lng)) throw new Error("invalid language");

  const localizedPath = path.join(TEMPLATE_DIR, lng, `${template}.pug`);
  if (existsSync(localizedPath)) return { template: localizedPath, lng };

  const defaultPath = path.join(TEMPLATE_DIR, config.defaultLanguage, `${template}.pug`);
  return { template: defaultPath, lng: config.defaultLanguage };
}

const TEMPLATE_OPTIONS: Email.EmailConfig = {
  // When printing to console, don't preprocess CSS, as it makes the printouts massive.
  juice: mailTransporter.transporter.name !== "console fallback",
  juiceResources: {
    preserveImportant: true,
    webResources: {
      relativeTo: path.join(TEMPLATE_DIR, "css"),
    },
  },
};

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
      const email = new Email(TEMPLATE_OPTIONS);
      const brandedParams = {
        ...params,
        branding: {
          footerText: config.brandingMailFooterText,
          footerLink: config.brandingMailFooterLink,
        },
      };
      const { template, lng } = getTemplate(language, "confirmation");
      const html = await email.render(template, brandedParams);
      const subject = i18next.t(`emails.confirmation.${params.type}.subject`, {
        lng,
        event: params.event.title,
      });
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendPaymentConfirmationMail(to: string, language: string | null, params: PaymentMailParams) {
    try {
      const email = new Email(TEMPLATE_OPTIONS);
      const brandedParams = {
        ...params,
        branding: {
          footerText: config.brandingMailFooterText,
          footerLink: config.brandingMailFooterLink,
        },
      };
      const { template, lng } = getTemplate(language, "payment");
      const html = await email.render(template, brandedParams);
      const subject = i18n.t("emails.paymentConfirmation.subject", { lng, event: params.event.title });
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendNewUserMail(to: string, language: string | null, params: NewUserMailParams) {
    try {
      const email = new Email(TEMPLATE_OPTIONS);
      const brandedParams = {
        ...params,
        siteUrl: adminUrl({ lang: language || config.defaultLanguage }),
        branding: {
          footerText: config.brandingMailFooterText,
          footerLink: config.brandingMailFooterLink,
        },
      };
      const { template, lng } = getTemplate(language, "newUser");
      const html = await email.render(template, brandedParams);
      const subject = i18n.t("emails.newUser.subject", { lng });
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendResetPasswordMail(to: string, language: string | null, params: NewUserMailParams) {
    try {
      const email = new Email(TEMPLATE_OPTIONS);
      const brandedParams = {
        ...params,
        siteUrl: adminUrl({ lang: language || config.defaultLanguage }),
        branding: {
          footerText: config.brandingMailFooterText,
          footerLink: config.brandingMailFooterLink,
        },
      };
      const { template, lng } = getTemplate(language, "resetPassword");
      const html = await email.render(template, brandedParams);
      const subject = i18n.t("emails.resetPassword.subject", { lng });
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }

  static async sendPromotedFromQueueMail(to: string, language: string | null, params: PromotedFromQueueMailParams) {
    try {
      const email = new Email(TEMPLATE_OPTIONS);
      const brandedParams = {
        ...params,
        branding: {
          footerText: config.brandingMailFooterText,
          footerLink: config.brandingMailFooterLink,
        },
      };
      const { template, lng } = getTemplate(language, "queueMail");
      const html = await email.render(template, brandedParams);
      const subject = i18n.t("emails.promotedFromQueue.subject", {
        lng,
        event: params.event.title,
      });
      await EmailService.send(to, subject, html);
    } catch (error) {
      console.error(error);
    }
  }
}
