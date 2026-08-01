import Mailgun from "mailgun.js";
import nodemailer, { Transport } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import config from "../config";

/** Common input values valid for both nodemailer and mailgun.js. */
type AbstractMailOptions = {
  to: string;
  from: string;
  subject: string;
  html: string;
};

/** Base type for the minimal interface we use in nodemailer. */
type AbstractTransporter = {
  sendMail: (options: AbstractMailOptions) => Promise<unknown>;
  transporter: Pick<Transport, "name">;
};

const mailTransporter: AbstractTransporter = (() => {
  if (config.nodeEnv === "test") {
    return nodemailer.createTransport({
      name: "console fallback",
      version: "0",
      send(mail, callback) {
        const { message } = mail;
        const envelope = message.getEnvelope();
        const messageId = message.messageId();
        // Completely ignore emails in test environment - mocking is done at EmailService.send before calling this
        setImmediate(() => callback(null, { envelope, messageId } as any));
      },
    });
  }

  if (config.mailgunApiKey) {
    if (!config.mailgunDomain) {
      throw new Error("Invalid email config: MAILGUN_DOMAIN must be set with MAILGUN_API_KEY.");
    }
    const mailgun = new Mailgun(FormData);
    const client = mailgun.client({
      username: "api",
      key: config.mailgunApiKey,
      url: config.mailgunHost ? `https://${config.mailgunHost}` : undefined,
    });
    // Wrap mailgun.js client to somewhat match nodemailer interface
    return {
      sendMail: (msg) => client.messages.create(config.mailgunDomain!, msg),
      transporter: { name: "Mailgun" },
    };
  }

  if (config.smtpHost) {
    if (!config.smtpUser || !config.smtpPassword) {
      throw new Error("Invalid email config: SMTP_USER and SMTP_PASSWORD must be set with SMTP_HOST.");
    }
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort ?? undefined,
      secure: config.smtpTls,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    } satisfies SMTPTransport.Options);
  }

  console.warn("Neither Mailgun nor SMTP is configured. Falling back to debug mail service.");
  return nodemailer.createTransport({
    name: "console fallback",
    version: "0",
    send(mail, callback) {
      const { message } = mail;
      const envelope = message.getEnvelope();
      const messageId = message.messageId();
      const input = message.createReadStream();
      let data = "";
      input.on("data", (chunk) => {
        data += chunk;
      });
      input.on("end", () => {
        console.log(data);
        callback(null, { envelope, messageId } as any);
      });
    },
  });
})();

export default mailTransporter;
