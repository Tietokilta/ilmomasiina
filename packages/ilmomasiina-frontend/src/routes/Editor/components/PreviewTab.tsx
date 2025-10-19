import React, { useMemo, useState } from "react";

import { Col, Row } from "react-bootstrap";
import { useFormState } from "react-final-form";
import { I18nextProvider, useTranslation } from "react-i18next";

import {
  EditSignupContextProvider,
  EditSignupState,
  getLocalizedEvent,
  SingleEventContextProvider,
  SingleEventState,
} from "@tietokilta/ilmomasiina-client";
import { EditorEvent } from "../../../modules/editor/types";
import { useTypedSelector } from "../../../store/reducers";
import EditSignupForm from "../../EditSignup/components/EditForm";
import EventDescription from "../../SingleEvent/components/EventDescription";
import SignupCountdown from "../../SingleEvent/components/SignupCountdown";
import LanguageSelect from "./LanguageSelect";
import { editorEventToUserEvent, previewDummySignup } from "./userComponentInterop";

const PreviewTab = () => {
  const { values } = useFormState<EditorEvent>();
  const [previewingForm, setPreviewingForm] = useState(false);
  const { i18n, t } = useTranslation();
  const selectedLanguage = useTypedSelector((state) => state.editor.selectedLanguage);

  const previewI18n = useMemo(() => i18n.cloneInstance({ lng: selectedLanguage }), [i18n, selectedLanguage]);

  // Render route contents with simulated state.
  const [singleEventCtx, editSignupCtx] = useMemo((): [SingleEventState, EditSignupState] => {
    const convertedEvent = editorEventToUserEvent(values);
    const localizedEvent = getLocalizedEvent(convertedEvent, selectedLanguage);
    const signup = previewDummySignup(convertedEvent);
    return [
      {
        pending: false,
        event: convertedEvent,
        localizedEvent,
        preview: { setPreviewingForm },
      },
      {
        pending: false,
        editToken: "",
        isNew: true,
        event: convertedEvent,
        localizedEvent,
        signup,
        localizedSignup: signup, // No need for quota name localization
        editingClosedOnLoad: false,
        confirmableUntil: Date.now() + 30 * 60 * 60 * 1000,
        editableUntil: Date.now() + 30 * 60 * 60 * 1000,
        preview: { setPreviewingForm },
      },
    ];
  }, [values, selectedLanguage]);

  return (
    <>
      <LanguageSelect label={t("editor.selectedLanguage.preview")} />
      <I18nextProvider i18n={previewI18n}>
        {previewingForm ? (
          <EditSignupContextProvider value={editSignupCtx}>
            <EditSignupForm />
          </EditSignupContextProvider>
        ) : (
          <SingleEventContextProvider value={singleEventCtx}>
            <Row className="event-editor--preview">
              <Col sm={12} md={8}>
                <EventDescription />
              </Col>
              <Col sm={12} md={4}>
                <SignupCountdown />
              </Col>
            </Row>
          </SingleEventContextProvider>
        )}
      </I18nextProvider>
    </>
  );
};

export default PreviewTab;
