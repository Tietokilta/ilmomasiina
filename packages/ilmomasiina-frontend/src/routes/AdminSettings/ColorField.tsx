import React, { useMemo } from "react";

import { Button, Form as BsForm, FormControl, FormText } from "react-bootstrap";
import { useField } from "react-final-form";
import { useTranslation } from "react-i18next";

import { parseHexColor } from "../../utils/brandColor";

/** Reads a compiled default color, exposed as a CSS variable in `styles/_branding.scss`. */
function useDefaultColor(variable: string) {
  return useMemo(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return parseHexColor(value) ? value : "#000000";
  }, [variable]);
}

type Props = {
  name: string;
  label: string;
  help: string;
  /** CSS variable holding the compiled default color. */
  defaultVariable: string;
};

/** Color picker and hex text input for a theme color. */
export default function ColorField({ name, label, help, defaultVariable }: Props) {
  const { input, meta } = useField<string | undefined>(name);
  const { t } = useTranslation();
  const defaultColor = useDefaultColor(defaultVariable);
  const value = input.value ?? "";
  const pickerValue = parseHexColor(value) ? value : defaultColor;
  const invalid = meta.touched && !!meta.error;
  return (
    <BsForm.Group className="mb-3">
      <BsForm.Label htmlFor={name}>{label}</BsForm.Label>
      <div className="ilmo--branding-color">
        <FormControl
          type="color"
          value={pickerValue}
          onChange={(evt) => input.onChange(evt.target.value)}
          onBlur={input.onBlur}
          title={label}
        />
        <FormControl
          {...input}
          id={name}
          value={value}
          type="text"
          placeholder={defaultColor}
          isInvalid={invalid}
          spellCheck={false}
          maxLength={7}
        />
        {value && (
          <Button variant="outline-secondary" size="sm" onClick={() => input.onChange("")}>
            {t("adminSettings.branding.color.reset")}
          </Button>
        )}
      </div>
      {invalid ? <FormText className="text-danger">{meta.error}</FormText> : null}
      <FormText>{help}</FormText>
    </BsForm.Group>
  );
}
