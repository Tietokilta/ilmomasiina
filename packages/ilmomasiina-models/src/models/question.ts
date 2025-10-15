import type { QuestionType } from "../enum";
import type EventAttributes from "./event";

export default interface QuestionAttributes {
  id: string;
  order: number;
  question: string;
  type: QuestionType;
  options: string[] | null;
  prices: number[] | null;
  required: boolean;
  public: boolean;
  eventId: EventAttributes["id"];
}
