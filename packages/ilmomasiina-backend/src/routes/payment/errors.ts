/* eslint-disable max-classes-per-file */
import { ErrorCode } from "@tietokilta/ilmomasiina-models";
import CustomError from "../../util/customError";

export class OnlinePaymentsDisabled extends CustomError {
  constructor(message: string) {
    super(400, ErrorCode.ONLINE_PAYMENTS_DISABLED, message);
  }
}

export class SignupNotConfirmed extends CustomError {
  constructor(message: string) {
    super(400, ErrorCode.SIGNUP_NOT_CONFIRMED, message);
  }
}

export class SignupInQueue extends CustomError {
  constructor(message: string) {
    super(400, ErrorCode.SIGNUP_IN_QUEUE, message);
  }
}

export class SignupAlreadyPaid extends CustomError {
  constructor(message: string) {
    super(400, ErrorCode.SIGNUP_ALREADY_PAID, message);
  }
}
export class PaymentInProgress extends CustomError {
  constructor(message: string) {
    super(409, ErrorCode.PAYMENT_IN_PROGRESS, message);
  }
}

export class PaymentNotRequired extends CustomError {
  constructor(message: string) {
    super(400, ErrorCode.PAYMENT_NOT_REQUIRED, message);
  }
}

export class PaymentNotFound extends CustomError {
  constructor(message: string) {
    super(400, ErrorCode.PAYMENT_NOT_FOUND, message);
  }
}

export class PaymentNotComplete extends CustomError {
  constructor(message: string) {
    super(400, ErrorCode.PAYMENT_NOT_COMPLETE, message);
  }
}

export class PaymentRateLimited extends CustomError {
  constructor(message: string) {
    super(429, ErrorCode.PAYMENT_RATE_LIMITED, message);
  }
}
