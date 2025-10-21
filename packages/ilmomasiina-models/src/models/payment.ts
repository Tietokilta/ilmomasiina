import type { PaymentStatus } from "../enum";

export default interface PaymentAttributes {
  id: string;
  signupId: string;
  amount: number;
  startedAt: string;
  completedAt: string;
  status: PaymentStatus | null;
}
