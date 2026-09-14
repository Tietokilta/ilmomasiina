import React, { useMemo } from "react";

import { Button, Form as BsForm, FormControl, FormText, Spinner } from "react-bootstrap";
import { Form, useField } from "react-final-form";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { ApiError, errorDesc } from "@tietokilta/ilmomasiina-client";
import {
  BRANDING_FAVICON_MAX_LENGTH,
  BRANDING_LOGO_MAX_LENGTH,
  BrandingResponse,
  BrandingUpdateBody,
} from "@tietokilta/ilmomasiina-models";
import defaultLogo from "../../assets/logo.svg";
import defaultBranding from "../../branding";
import FieldFormGroup from "../../components/FieldFormGroup";
import i18n, { TKey } from "../../i18n";
import useStore from "../../modules/store";
import { parseHexColor } from "../../utils/brandColor";
import useEvent from "../../utils/useEvent";
import ImageField, { formatMaxSize } from "./ImageField";

/** Form values. Text fields use "" instead of null for "use default".
 * Note that final-form turns empty strings into `undefined` when a field is cleared.
 */
type FormData = {
  headerTitle?: string;
  headerTitleShort?: string;
  brandColor?: string;
  dangerColor?: string;
  logo: string | null;
  favicon: string | null;
};

function toFormData(branding: BrandingResponse): FormData {
  return {
    headerTitle: branding.headerTitle ?? "",
    headerTitleShort: branding.headerTitleShort ?? "",
    brandColor: branding.brandColor ?? "",
    dangerColor: branding.dangerColor ?? "",
    logo: branding.logo,
    favicon: branding.favicon,
  };
}

function toUpdateBody(data: FormData): BrandingUpdateBody {
  return {
    headerTitle: data.headerTitle?.trim() || null,
    headerTitleShort: data.headerTitleShort?.trim() || null,
    brandColor: data.brandColor?.trim().toLowerCase() || null,
    dangerColor: data.dangerColor?.trim().toLowerCase() || null,
    logo: data.logo,
    favicon: data.favicon,
  };
}

function validate(values: FormData) {
  const errors: Partial<Record<keyof FormData, string>> = {};
  if (values.brandColor?.trim() && !parseHexColor(values.brandColor)) {
    errors.brandColor = i18n.t("adminSettings.branding.color.invalid");
  }
  if (values.dangerColor?.trim() && !parseHexColor(values.dangerColor)) {
    errors.dangerColor = i18n.t("adminSettings.branding.color.invalid");
  }
  return errors;
}

/** Reads a compiled default color, exposed as a CSS variable in `styles/_branding.scss`. */
function useDefaultColor(variable: string) {
  return useMemo(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return parseHexColor(value) ? value : "#000000";
  }, [variable]);
}

type ColorFieldProps = {
  name: "brandColor" | "dangerColor";
  label: string;
  help: string;
  /** CSS variable holding the compiled default color. */
  defaultVariable: string;
};

/** Color picker and hex text input for a theme color. */
const ColorField = ({ name, label, help, defaultVariable }: ColorFieldProps) => {
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
};

type Props = {
  branding: BrandingResponse;
};

const BrandingForm = ({ branding }: Props) => {
  const updateBranding = useStore((state) => state.adminSettings.updateBranding);
  const { t } = useTranslation();

  const onSubmit = useEvent(async (data: FormData) => {
    try {
      await updateBranding(toUpdateBody(data));
      toast.success(t("adminSettings.branding.success"), { autoClose: 2000 });
    } catch (err) {
      toast.error(t(errorDesc<TKey>(err as ApiError, "adminSettings.branding.errors")), { autoClose: 5000 });
    }
  });

  return (
    <Form<FormData> initialValues={toFormData(branding)} onSubmit={onSubmit} validate={validate}>
      {({ submitting, handleSubmit }) => (
        <BsForm className="ilmo--form" onSubmit={handleSubmit}>
          <FieldFormGroup name="headerTitle" label={t("adminSettings.branding.headerTitle")}>
            {({ input }) => (
              <FormControl {...input} type="text" maxLength={100} placeholder={defaultBranding.headerTitle} />
            )}
          </FieldFormGroup>
          <FieldFormGroup name="headerTitleShort" label={t("adminSettings.branding.headerTitleShort")}>
            {({ input }) => (
              <FormControl {...input} type="text" maxLength={100} placeholder={defaultBranding.headerTitleShort} />
            )}
          </FieldFormGroup>
          <ColorField
            name="brandColor"
            label={t("adminSettings.branding.brandColor")}
            help={t("adminSettings.branding.brandColor.help")}
            defaultVariable="--ilmo-default-brand-color"
          />
          <ColorField
            name="dangerColor"
            label={t("adminSettings.branding.dangerColor")}
            help={t("adminSettings.branding.dangerColor.help")}
            defaultVariable="--ilmo-default-danger-color"
          />
          <ImageField
            name="logo"
            label={t("adminSettings.branding.logo")}
            help={t("adminSettings.branding.logo.help", { maxSize: formatMaxSize(BRANDING_LOGO_MAX_LENGTH) })}
            accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp"
            maxLength={BRANDING_LOGO_MAX_LENGTH}
            defaultPreview={defaultLogo}
          />
          <ImageField
            name="favicon"
            label={t("adminSettings.branding.favicon")}
            help={t("adminSettings.branding.favicon.help", { maxSize: formatMaxSize(BRANDING_FAVICON_MAX_LENGTH) })}
            accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml,.ico"
            maxLength={BRANDING_FAVICON_MAX_LENGTH}
            defaultPreview={`${PATH_PREFIX}/favicon-32x32.png`}
          />
          <Button type="submit" variant="secondary" disabled={submitting}>
            {submitting ? <Spinner animation="border" /> : t("adminSettings.branding.submit")}
          </Button>
        </BsForm>
      )}
    </Form>
  );
};

export default BrandingForm;
