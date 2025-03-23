import React, { useMemo, useState } from "react";

import { Col, Row } from "react-bootstrap";
import { useFormState } from "react-final-form";

import {
  EditSignupContextProvider,
  EditSignupState,
  SingleEventContextProvider,
  SingleEventState,
} from "@tietokilta/ilmomasiina-components";
import EditSignupForm from "@tietokilta/ilmomasiina-components/dist/routes/EditSignup/components/EditForm";
import EventDescription from "@tietokilta/ilmomasiina-components/dist/routes/SingleEvent/components/EventDescription";
import SignupCountdown from "@tietokilta/ilmomasiina-components/dist/routes/SingleEvent/components/SignupCountdown";
import { EditorEvent } from "../../../modules/editor/types";
import { editorEventToUserEvent, previewDummySignup } from "./userComponentInterop";

const PreviewTab = () => {
  const { values } = useFormState<EditorEvent>();
  const [previewingForm, setPreviewingForm] = useState(false);

  // Render route contents with simulated state.
  const [singleEventCtx, editSignupCtx] = useMemo((): [SingleEventState, EditSignupState] => {
    const convertedEvent = editorEventToUserEvent(values);
    return [
      {
        pending: false,
        event: convertedEvent,
        preview: { setPreviewingForm },
      },
      {
        pending: false,
        editToken: "",
        isNew: true,
        event: convertedEvent,
        signup: previewDummySignup(convertedEvent),
        editingClosedOnLoad: false,
        confirmableUntil: Date.now() + 30 * 60 * 60 * 1000,
        editableUntil: Date.now() + 30 * 60 * 60 * 1000,
        preview: { setPreviewingForm },
      },
    ];
  }, [values]);

  return previewingForm ? (
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
  );
};

export default PreviewTab;
