import React, { ChangeEvent, useMemo } from "react";

import { useField } from "react-final-form";
import { useTranslation } from "react-i18next";

import { EditorEvent } from "../../../modules/editor/types";
import useStore from "../../../modules/store";
import useEvent from "../../../utils/useEvent";
import { useFieldValue } from "./hooks";
import SelectBox from "./SelectBox";

type Props = {
  label?: string;
};

const LanguageSelect = ({ label }: Props) => {
  const { t } = useTranslation();
  const {
    input: { value: languages },
  } = useField<EditorEvent["languages"]>("languages");
  const defaultLanguage = useFieldValue<string>("defaultLanguage");
  const { selectedLanguage, languageSelected } = useStore((state) => state.editor);

  const options = useMemo(
    (): [string, string][] => [
      [defaultLanguage, `${t("languageName", { lng: defaultLanguage })} (${t("editor.selectedLanguage.default")})`],
      ...Object.keys(languages)
        .filter((language) => language !== defaultLanguage)
        .map((language): [string, string] => [language, t("languageName", { lng: language })]),
    ],
    [t, languages, defaultLanguage],
  );

  const handleChange = useEvent((evt: ChangeEvent<HTMLSelectElement>) => {
    languageSelected(evt.currentTarget.value);
  });

  return (
    <div className="event-editor--selected-language">
      <label htmlFor="selectedLanguage">{label ?? t("editor.selectedLanguage")}</label>
      <SelectBox id="selectedLanguage" options={options} value={selectedLanguage} onChange={handleChange} />
    </div>
  );
};

export default LanguageSelect;
