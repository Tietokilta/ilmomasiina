import type { PaymentStatus, SignupStatus } from "../enum";
import type QuotaAttributes from "./quota";

export default interface SignupAttributes {
  id: string;
  firstName: string | null;
  lastName: string | null;
  namePublic: boolean;
  email: string | null;
  language: string | null;
  confirmedAt: Date | null;
  status: SignupStatus | null;
  position: number | null;
  createdAt: Date;
  price: number;
  quotaId: QuotaAttributes["id"];
  paymentStatus: PaymentStatus | null;
}
