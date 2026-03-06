import React from "react";

import { Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";

import FieldRow from "../../../components/FieldRow";
import useEditorErrors from "./errors";
import { useFieldValue } from "./hooks";
import LanguageSelect from "./LanguageSelect";
import Questions from "./Questions";

const QuestionsTab = () => {
  const nameQuestion = useFieldValue<boolean>("nameQuestion");
  const emailQuestion = useFieldValue<boolean>("emailQuestion");
  const { t } = useTranslation();
  const formatError = useEditorErrors();
  return (
    <div>
      <LanguageSelect />
      <FieldRow
        name="nameQuestion"
        label={t("editor.questions.nameQuestion")}
        as={Form.Check}
        type="checkbox"
        checkAlign
        checkLabel={t("editor.questions.nameQuestion.check")}
        help={nameQuestion ? t("editor.questions.nameQuestion.infoOn") : t("editor.questions.nameQuestion.infoOff")}
        formatError={formatError}
      />
      <FieldRow
        name="emailQuestion"
        label={t("editor.questions.emailQuestion")}
        as={Form.Check}
        type="checkbox"
        checkAlign
        checkLabel={t("editor.questions.emailQuestion.check")}
        help={emailQuestion ? t("editor.questions.emailQuestion.infoOn") : t("editor.questions.emailQuestion.infoOff")}
        formatError={formatError}
      />
      <Questions />
    </div>
  );
};

export default QuestionsTab;
