import type { QuestionLanguage, QuotaLanguage } from "../schema";

interface EventPerLanguageAttributes {
  title: string;
  description: string | null;
  price: string | null;
  location: string | null;
  webpageUrl: string | null;
  facebookUrl: string | null;
  verificationEmail: string | null;
}

export interface EventLanguage extends EventPerLanguageAttributes {
  quotas: QuotaLanguage[];
  questions: QuestionLanguage[];
}

export default interface EventAttributes extends EventPerLanguageAttributes {
  id: string;
  slug: string;
  date: Date | null;
  endDate: Date | null;
  registrationStartDate: Date | null;
  registrationEndDate: Date | null;
  openQuotaSize: number;
  category: string;
  draft: boolean;
  listed: boolean;
  signupsPublic: boolean;
  nameQuestion: boolean;
  emailQuestion: boolean;
  languages: Record<string, EventLanguage>;
  defaultLanguage: string;
  updatedAt: Date;
}
