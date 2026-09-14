import React, { ChangeEvent, ReactNode, useId } from "react";

import { Button, FormControl, FormGroup, FormLabel, FormText } from "react-bootstrap";
import { useField } from "react-final-form";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { BRANDING_IMAGE_DATA_URL_PATTERN } from "@tietokilta/ilmomasiina-models";

const imageDataUrlRegex = new RegExp(BRANDING_IMAGE_DATA_URL_PATTERN);

/** Formats a data URL length limit as an approximate file size for display. */
export function formatMaxSize(maxLength: number) {
  // Base64 encoding grows the file by 4/3, plus the data URL prefix.
  return `${Math.floor((maxLength * 3) / 4 / 1024)} kB`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

type Props = {
  /** Form field name. The value is an image data URL, or null for the default image. */
  name: string;
  label: ReactNode;
  help: ReactNode;
  /** Accepted file types for the file input. */
  accept: string;
  /** Maximum data URL length, from `ilmomasiina-models`. */
  maxLength: number;
  /** Image to show as preview when no custom image is set. */
  defaultPreview?: string;
};

/** A form field for uploading a small image, stored as a data URL. */
export default function ImageField({ name, label, help, accept, maxLength, defaultPreview }: Props) {
  const { input } = useField<string | null>(name);
  const { t } = useTranslation();
  const id = useId();

  const onFileChange = async (evt: ChangeEvent<HTMLInputElement>) => {
    const { target } = evt;
    const file = target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (dataUrl.length > maxLength) {
        toast.error(t("adminSettings.branding.image.errors.fileTooLarge", { maxSize: formatMaxSize(maxLength) }));
      } else if (!imageDataUrlRegex.test(dataUrl)) {
        toast.error(t("adminSettings.branding.image.errors.unsupportedType"));
      } else {
        input.onChange(dataUrl);
      }
    } catch {
      toast.error(t("adminSettings.branding.image.errors.readFailed"));
    } finally {
      // Allow selecting the same file again.
      target.value = "";
    }
  };

  const preview = input.value || defaultPreview;

  return (
    <FormGroup className="mb-3" controlId={id}>
      <FormLabel>{label}</FormLabel>
      <div className="ilmo--branding-image">
        <div className="ilmo--branding-image-preview">
          {preview ? <img src={preview} alt="" /> : <div />}
          <span>
            {input.value ? t("adminSettings.branding.image.custom") : t("adminSettings.branding.image.default")}
          </span>
        </div>
        <div className="ilmo--branding-image-controls">
          <FormControl type="file" accept={accept} onChange={onFileChange} />
          {input.value && (
            <div>
              <Button variant="outline-secondary" size="sm" onClick={() => input.onChange(null)}>
                {t("adminSettings.branding.image.remove")}
              </Button>
            </div>
          )}
        </div>
      </div>
      <FormText>{help}</FormText>
    </FormGroup>
  );
}
