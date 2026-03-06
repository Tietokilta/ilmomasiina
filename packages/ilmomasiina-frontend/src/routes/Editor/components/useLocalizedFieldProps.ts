import { useTranslation } from "react-i18next";

import useStore from "../../../modules/store";
import { useFieldValue } from "./hooks";

export type FieldLocalizationOptions = {
  /** If true, show the unlocalized value as placeholder. */
  defaultAsPlaceholder?: boolean;
};

type LocalizedFieldOptions = {
  /** The unlocalized name of the field in the data. Prepended with `languages.xx.` to make a localized name. */
  name: string;
  /** Whether the field is required. */
  required?: boolean;
} & FieldLocalizationOptions;

/** Resolves which version of a localized field should be shown based on the selected language. */
function useLocalizedFieldInfo(baseName: string) {
  const selectedLanguage = useStore((state) => state.editor.selectedLanguage);
  const defaultLanguage = useFieldValue<string>("defaultLanguage");

  const isDefaultLanguage = selectedLanguage === defaultLanguage;
  const localizedName = `languages.${selectedLanguage}.${baseName}`;
  const name = isDefaultLanguage ? baseName : localizedName;

  return { localizedName, name, selectedLanguage, isDefaultLanguage };
}

type LocalizedProps = {
  name: string;
  required?: boolean;
  placeholder?: string;
};

/** Computes common options for `LocalizedField` and `LocalizedFieldRow`. */
export default function useLocalizedFieldProps({
  name: baseName,
  required,
  defaultAsPlaceholder,
}: LocalizedFieldOptions): LocalizedProps {
  const defaultLangValue = useFieldValue<string>(baseName);
  const { t } = useTranslation();

  const { isDefaultLanguage, name } = useLocalizedFieldInfo(baseName);

  const placeholder =
    !isDefaultLanguage && defaultAsPlaceholder
      ? { placeholder: `${t("editor.inheritedFromDefaultLanguage")}${defaultLangValue}` }
      : {};

  return {
    name,
    // Ensure fields in other languages are not required
    required: required && isDefaultLanguage,
    ...placeholder,
  };
}
