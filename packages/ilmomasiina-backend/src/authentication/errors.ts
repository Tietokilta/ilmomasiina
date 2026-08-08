import { ErrorCode } from "@tietokilta/ilmomasiina-models";
import CustomError from "../util/customError";

export class BadSession extends CustomError {
  constructor(message: string) {
    super(401, ErrorCode.BAD_SESSION, message);
  }
}
