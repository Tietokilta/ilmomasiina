/* eslint-disable max-classes-per-file */
import { ErrorCode } from '@tietokilta/ilmomasiina-models';
import CustomError from '../../util/customError';

export class SignupsClosed extends CustomError {
  constructor(message: string) {
    super(403, ErrorCode.SIGNUPS_CLOSED, message);
  }
}

export class NoSuchQuota extends CustomError {
  constructor(message: string) {
    super(404, ErrorCode.NO_SUCH_QUOTA, message);
  }
}
export class NoSuchEvent extends CustomError {
  constructor(message: string) {
    super(404, ErrorCode.NO_SUCH_EVENT, message);
  }
}

export class NoSuchSignup extends CustomError {
  constructor(message: string) {
    super(404, ErrorCode.NO_SUCH_SIGNUP, message);
  }
}
