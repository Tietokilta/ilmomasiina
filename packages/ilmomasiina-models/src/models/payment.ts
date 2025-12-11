import type { PaymentStatus } from "../enum";

export default interface PaymentAttributes {
  stripeId: string;
  signupId: string;
  editToken: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  completedAt: Date | null;
  status: PaymentStatus | null;
}
