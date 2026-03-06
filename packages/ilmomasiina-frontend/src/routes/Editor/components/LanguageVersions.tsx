import React from "react";

import { omit, pick } from "lodash-es";
import { Button, ButtonGroup } from "react-bootstrap";
import { useField, useForm } from "react-final-form";
import { useTranslation } from "react-i18next";

import { AdminEventLanguage } from "@tietokilta/ilmomasiina-models";
import { knownLanguages } from "../../../i18n";
import { EditorEvent } from "../../../modules/editor/types";
import useStore from "../../../modules/store";
import useEvent from "../../../utils/useEvent";

type VersionProps = { language: string };

const LanguageVersion = ({ language }: VersionProps) => {
  const { t } = useTranslation();
  const {
    input: { value: defaultLanguage },
  } = useField<string>("defaultLanguage");
  const {
    input: { value: languages },
  } = useField<EditorEvent["languages"]>("languages");
  const { change, getState } = useForm<EditorEvent>();
  const { selectedLanguage, languageSelected } = useStore((state) => state.editor);

  const isPresent = language in languages;
  const isDefault = language === defaultLanguage;
  const isEditing = selectedLanguage === language;

  const edit = useEvent(() => {
    languageSelected(language);
  });

  const setAsDefault = useEvent(() => {
    // If the language is present, we need to swap it with the default.
    if (isPresent) {
      const { values } = getState();
      // First, extract all the language version fields from the event, and add the result to languages.
      const eventKeys = [
        "description",
        "title",
        "price",
        "location",
        "webpageUrl",
        "facebookUrl",
        "verificationEmail",
      ] as const;
      const oldDefaultLanguage: AdminEventLanguage = {
        ...pick(values, eventKeys),
        questions: values.questions.map((question) => pick(question, "question", "options")),
        quotas: values.quotas.map((quota) => pick(quota, "title")),
      };
      change("languages", {
        ...omit(languages, language),
        [defaultLanguage]: oldDefaultLanguage,
      });
      // Then, overwrite the event fields with the new default language.
      const newDefaultLanguage = languages[language];
      for (const key of eventKeys) change(key, newDefaultLanguage[key]);
      change(
        "questions",
        values.questions.map((question, i) => ({
          ...question,
          ...newDefaultLanguage.questions[i],
          // options needs separate handling because it's non-nullable in EditorQuestion
          options: newDefaultLanguage.questions[i].options ?? question.options,
        })),
      );
      change(
        "quotas",
        values.quotas.map((quota, i) => ({ ...quota, ...newDefaultLanguage.quotas[i] })),
      );
    }
    change("defaultLanguage", language);
    // Finally, start editing the new default language.
    languageSelected(language);
  });

  const add = useEvent(() => {
    const { quotas, questions } = getState().values;
    // Add empty language to event.
    change("languages", {
      ...languages,
      [language]: {
        title: "",
        description: null,
        price: null,
        location: null,
        webpageUrl: null,
        facebookUrl: null,
        verificationEmail: null,
        quotas: quotas.map(() => ({ title: "" })),
        questions: questions.map((question) => ({
          question: "",
          options: question.options.map(() => ""),
        })),
      },
    });
    // Finally, start editing the new language.
    languageSelected(language);
  });

  const remove = useEvent(() => {
    // Remove language from event.
    change("languages", omit(languages, language));
    // Switch to default language if we removed the active one.
    if (isEditing) languageSelected(defaultLanguage);
  });

  const labels: string[] = [];
  if (isDefault) labels.push(t("editor.basic.languages.default"));
  if (isEditing) labels.push(t("editor.basic.languages.editing"));

  return (
    <div className="event-editor--language-version">
      <span>
        {t("languageName", { lng: language })}
        {labels.length > 0 && <span className="text-muted"> ({labels.join(", ")})</span>}
      </span>
      <ButtonGroup size="sm">
        {!isPresent && !isDefault && (
          <Button variant="primary" size="sm" onClick={add}>
            {t("editor.basic.languages.add")}
          </Button>
        )}
        {(isDefault || isPresent) && !isEditing && (
          <Button variant="primary" size="sm" onClick={edit}>
            {t("editor.basic.languages.edit")}
          </Button>
        )}
        {!isDefault && (
          <Button variant="primary" size="sm" onClick={setAsDefault}>
            {t("editor.basic.languages.setDefault")}
          </Button>
        )}
        {isPresent && !isDefault && (
          <Button variant="danger" size="sm" onClick={remove}>
            {t("editor.basic.languages.delete")}
          </Button>
        )}
      </ButtonGroup>
    </div>
  );
};

const LanguageVersions = () => (
  <div className="event-editor--language-versions">
    {knownLanguages.map((language) => (
      <LanguageVersion key={language} language={language} />
    ))}
  </div>
);

export default LanguageVersions;
