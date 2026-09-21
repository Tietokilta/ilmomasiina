import {
  EditConflictError,
  ErrorCode,
  QuestionID,
  QuotaID,
  WouldMoveSignupsToQueueError,
} from "@tietokilta/ilmomasiina-models";
import CustomError from "../../../util/customError";

export class EditConflict extends CustomError implements EditConflictError {
  public readonly updatedAt: string; // in date-time format
  public readonly deletedQuotas: QuotaID[];
  public readonly deletedQuestions: QuestionID[];

  constructor(updatedAt: Date, deletedQuotas: QuotaID[], deletedQuestions: QuestionID[]) {
    const updatedAtStr = updatedAt.toISOString();
    super(409, ErrorCode.EDIT_CONFLICT, `the event was updated separately at ${updatedAtStr}`);
    this.updatedAt = updatedAtStr;
    this.deletedQuotas = deletedQuotas;
    this.deletedQuestions = deletedQuestions;
  }
}

export class WouldMoveSignupsToQueue extends CustomError implements WouldMoveSignupsToQueueError {
  public readonly count: number;

  constructor(count: number) {
    super(409, ErrorCode.WOULD_MOVE_SIGNUPS_TO_QUEUE, `this change would move ${count} signups into the queue`);
    this.count = count;
  }
}
