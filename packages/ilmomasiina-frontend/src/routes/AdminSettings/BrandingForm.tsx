import React, { useEffect } from "react";

import { Button, Form as BsForm, FormControl, FormSelect, Spinner } from "react-bootstrap";
import { Form, FormSpy } from "react-final-form";
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
import { useBrandingStore } from "../../modules/branding";
import useStore from "../../modules/store";
import { isHexColor } from "../../utils/brandColor";
import useEvent from "../../utils/useEvent";
import ColorField from "./ColorField";
import ImageField, { formatMaxSize } from "./ImageField";

/** Text and color fields of the form. "" means "use default". */
const textKeys = [
  "headerTitle",
  "headerTitleShort",
  "footerGdprText",
  "footerGdprLink",
  "footerHomeText",
  "footerHomeLink",
  "loginPlaceholderEmail",
  "icalCalendarName",
  "mailFooterText",
  "mailFooterLink",
] as const;
const colorKeys = ["brandColor", "secondaryColor", "successColor", "warningColor", "dangerColor", "mutedColor"] as const;

type TextKey = (typeof textKeys)[number];
type ColorKey = (typeof colorKeys)[number];

/** Form values. Text fields use "" instead of null for "use default".
 * Note that final-form turns empty strings into `undefined` when a field is cleared.
 */
type FormData = Partial<Record<TextKey | ColorKey, string>> & {
  logo: string | null;
  /** "" (or undefined) for default, "show" or "hide". */
  showLogo?: "" | "show" | "hide";
  favicon: string | null;
};

function showLogoToForm(showLogo: boolean | null): FormData["showLogo"] {
  if (showLogo === null) return "";
  return showLogo ? "show" : "hide";
}

function toFormData(branding: BrandingResponse): FormData {
  const data: FormData = {
    logo: branding.logo,
    showLogo: showLogoToForm(branding.showLogo),
    favicon: branding.favicon,
  };
  [...textKeys, ...colorKeys].forEach((key) => {
    data[key] = branding[key] ?? "";
  });
  return data;
}

function toUpdateBody(data: FormData): BrandingUpdateBody {
  const body = {
    logo: data.logo,
    showLogo: data.showLogo ? data.showLogo === "show" : null,
    favicon: data.favicon,
  } as BrandingUpdateBody;
  textKeys.forEach((key) => {
    body[key] = data[key]?.trim() || null;
  });
  colorKeys.forEach((key) => {
    body[key] = data[key]?.trim().toLowerCase() || null;
  });
  return body;
}

function validate(values: FormData) {
  const errors: Partial<Record<keyof FormData, string>> = {};
  colorKeys.forEach((key) => {
    const value = values[key]?.trim();
    if (value && !isHexColor(value)) {
      errors[key] = i18n.t("adminSettings.branding.color.invalid");
    }
  });
  (["footerGdprLink", "footerHomeLink", "mailFooterLink"] as const).forEach((key) => {
    const value = values[key]?.trim();
    if (value && !/^(https?:\/\/|mailto:|\/)/.test(value)) {
      errors[key] = i18n.t("adminSettings.branding.link.invalid");
    }
  });
  return errors;
}

/** Converts form values to a branding for live preview, dropping values that fail validation. */
function toPreviewBranding(data: FormData): BrandingUpdateBody {
  const body = toUpdateBody(data);
  const errors = validate(data);
  (Object.keys(errors) as (keyof BrandingUpdateBody)[]).forEach((key) => {
    body[key] = null as never;
  });
  return body;
}

type TextFieldProps = {
  name: TextKey;
  label: string;
  placeholder?: string;
  maxLength?: number;
  help?: string;
  type?: "text" | "url";
};

const TextField = ({ name, label, placeholder, maxLength = 200, help, type = "text" }: TextFieldProps) => (
  <FieldFormGroup name={name} label={label}>
    {({ input, meta: { touched, error } }) => (
      <>
        <FormControl
          {...input}
          value={input.value ?? ""}
          type={type}
          maxLength={maxLength}
          placeholder={placeholder}
          isInvalid={touched && !!error}
        />
        {help && <BsForm.Text>{help}</BsForm.Text>}
      </>
    )}
  </FieldFormGroup>
);

type PreviewProps = {
  values: FormData;
};

/** Previews the current form values on the page. Done in an effect, as FormSpy renders on every change. */
const PreviewBranding = ({ values }: PreviewProps) => {
  const previewBranding = useBrandingStore((state) => state.previewBranding);
  useEffect(() => {
    previewBranding(toPreviewBranding(values));
  }, [values, previewBranding]);
  return null;
};

type Props = {
  branding: BrandingResponse;
};

const BrandingForm = ({ branding }: Props) => {
  const updateBranding = useStore((state) => state.adminSettings.updateBranding);
  const { setBranding, endPreview } = useBrandingStore();
  const { t } = useTranslation();

  // Stop previewing when leaving the page, reverting to the saved branding.
  useEffect(() => endPreview, [endPreview]);

  const onSubmit = useEvent(async (data: FormData) => {
    try {
      const saved = await updateBranding(toUpdateBody(data));
      setBranding(saved);
      toast.success(t("adminSettings.branding.success"), { autoClose: 2000 });
    } catch (err) {
      toast.error(t(errorDesc<TKey>(err as ApiError, "adminSettings.branding.errors")), { autoClose: 5000 });
    }
  });

  return (
    <Form<FormData> initialValues={toFormData(branding)} onSubmit={onSubmit} validate={validate}>
      {({ submitting, handleSubmit }) => (
        <BsForm className="ilmo--form ilmo--theme-safe" onSubmit={handleSubmit}>
          {/* Preview edits live on the page. The form itself opts out of theme colors (see _branding.scss),
              so it stays usable even if the previewed colors are unreadable. */}
          <FormSpy<FormData> subscription={{ values: true }}>
            {({ values }) => <PreviewBranding values={values} />}
          </FormSpy>
          <h2>{t("adminSettings.texts.title")}</h2>
          <TextField
            name="headerTitle"
            label={t("adminSettings.branding.headerTitle")}
            placeholder={defaultBranding.headerTitle}
            maxLength={100}
            help={t("adminSettings.branding.headerTitle.help")}
          />
          <TextField
            name="headerTitleShort"
            label={t("adminSettings.branding.headerTitleShort")}
            placeholder={defaultBranding.headerTitleShort}
            maxLength={100}
          />
          <TextField
            name="footerGdprText"
            label={t("adminSettings.branding.footerGdprText")}
            placeholder={defaultBranding.footerGdprText || t("adminSettings.branding.link.notShown")}
          />
          <TextField
            name="footerGdprLink"
            label={t("adminSettings.branding.footerGdprLink")}
            placeholder={defaultBranding.footerGdprLink || "https://"}
            maxLength={500}
            type="url"
          />
          <TextField
            name="footerHomeText"
            label={t("adminSettings.branding.footerHomeText")}
            placeholder={defaultBranding.footerHomeText || t("adminSettings.branding.link.notShown")}
          />
          <TextField
            name="footerHomeLink"
            label={t("adminSettings.branding.footerHomeLink")}
            placeholder={defaultBranding.footerHomeLink || "https://"}
            maxLength={500}
            type="url"
          />
          <TextField
            name="loginPlaceholderEmail"
            label={t("adminSettings.branding.loginPlaceholderEmail")}
            placeholder={defaultBranding.loginPlaceholderEmail}
            maxLength={255}
          />
          <TextField
            name="icalCalendarName"
            label={t("adminSettings.branding.icalCalendarName")}
            placeholder={t("adminSettings.branding.serverDefault")}
            maxLength={100}
          />
          <TextField
            name="mailFooterText"
            label={t("adminSettings.branding.mailFooterText")}
            placeholder={t("adminSettings.branding.serverDefault")}
            maxLength={500}
            help={t("adminSettings.branding.mailFooter.help")}
          />
          <TextField
            name="mailFooterLink"
            label={t("adminSettings.branding.mailFooterLink")}
            placeholder={t("adminSettings.branding.serverDefault")}
            maxLength={500}
            type="url"
          />

          <h2>{t("adminSettings.colors.title")}</h2>
          <ColorField
            name="brandColor"
            label={t("adminSettings.branding.brandColor")}
            help={t("adminSettings.branding.brandColor.help")}
            defaultVariable="--ilmo-default-brand-color"
          />
          <ColorField
            name="secondaryColor"
            label={t("adminSettings.branding.secondaryColor")}
            help={t("adminSettings.branding.secondaryColor.help")}
            defaultVariable="--ilmo-default-secondary-color"
          />
          <ColorField
            name="successColor"
            label={t("adminSettings.branding.successColor")}
            help={t("adminSettings.branding.successColor.help")}
            defaultVariable="--ilmo-default-success-color"
          />
          <ColorField
            name="warningColor"
            label={t("adminSettings.branding.warningColor")}
            help={t("adminSettings.branding.warningColor.help")}
            defaultVariable="--ilmo-default-warning-color"
          />
          <ColorField
            name="dangerColor"
            label={t("adminSettings.branding.dangerColor")}
            help={t("adminSettings.branding.dangerColor.help")}
            defaultVariable="--ilmo-default-danger-color"
          />
          <ColorField
            name="mutedColor"
            label={t("adminSettings.branding.mutedColor")}
            help={t("adminSettings.branding.mutedColor.help")}
            defaultVariable="--ilmo-default-muted-color"
          />

          <h2>{t("adminSettings.images.title")}</h2>
          <ImageField
            name="logo"
            label={t("adminSettings.branding.logo")}
            help={t("adminSettings.branding.logo.help", { maxSize: formatMaxSize(BRANDING_LOGO_MAX_LENGTH) })}
            accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp"
            maxLength={BRANDING_LOGO_MAX_LENGTH}
            defaultPreview={defaultLogo}
          />
          <FieldFormGroup name="showLogo" label={t("adminSettings.branding.showLogo")}>
            {({ input }) => (
              <FormSelect {...input} value={input.value ?? ""}>
                <option value="">{t("adminSettings.branding.showLogo.default")}</option>
                <option value="show">{t("adminSettings.branding.showLogo.show")}</option>
                <option value="hide">{t("adminSettings.branding.showLogo.hide")}</option>
              </FormSelect>
            )}
          </FieldFormGroup>
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
