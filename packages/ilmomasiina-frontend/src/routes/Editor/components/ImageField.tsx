import React, { ChangeEvent, useRef, useState } from "react";

import { Button, Form } from "react-bootstrap";
import { useField } from "react-final-form";
import { useTranslation } from "react-i18next";

import FieldRow from "../../../components/FieldRow";
import useStore from "../../../modules/store";
import useEditorErrors from "./errors";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
/** Same limit as the server's. */
const MAX_BYTES = 5 * 1024 * 1024;

/** Cover image field: upload a PNG/JPEG/WebP file, or paste a link. Stores the image URL. */
const ImageField = () => {
  const { t } = useTranslation();
  const formatError = useEditorErrors();
  const adminApiFetch = useStore((state) => state.auth.adminApiFetch);
  const { input } = useField<string | null>("imageUrl", { parse: (value) => value });
  const url = input.value || "";

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Allow choosing the same file again later.
    // eslint-disable-next-line no-param-reassign
    event.target.value = "";
    if (!file) return;

    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t("editor.basic.imageUrl.errors.type"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("editor.basic.imageUrl.errors.size"));
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await adminApiFetch<{ url: string }>("admin/images", { method: "POST", body });
      input.onChange(response.url);
    } catch {
      setError(t("editor.basic.imageUrl.errors.failed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <FieldRow
      name="imageUrl"
      label={t("editor.basic.imageUrl")}
      help={t("editor.basic.imageUrl.info")}
      formatError={formatError}
    >
      <div className="ilmo--image-field">
        {url && <img className="ilmo--image-field-preview" src={url} alt="" />}
        <div className="ilmo--image-field-actions">
          <Button variant="outline-secondary" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? t("editor.basic.imageUrl.uploading") : t("editor.basic.imageUrl.upload")}
          </Button>
          {url && (
            <Button variant="outline-secondary" disabled={uploading} onClick={() => input.onChange("")}>
              {t("editor.basic.imageUrl.remove")}
            </Button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            hidden
            onChange={upload}
            aria-label={t("editor.basic.imageUrl.upload")}
          />
        </div>
        <Form.Control
          id="imageUrl"
          name={input.name}
          value={url}
          onChange={input.onChange}
          onBlur={input.onBlur}
          onFocus={input.onFocus}
          maxLength={1024}
          placeholder={t("editor.basic.imageUrl.placeholder")}
        />
        {error && <Form.Text className="text-danger">{error}</Form.Text>}
      </div>
    </FieldRow>
  );
};

export default ImageField;
