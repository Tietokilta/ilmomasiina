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
import { SignupStatus } from "@tietokilta/ilmomasiina-models";
import { editorEventToServer } from "../../../modules/editor/actions";
import { EditorEvent } from "../../../modules/editor/types";

const PreviewTab = () => {
  const { values } = useFormState<EditorEvent>();
  const [previewingForm, setPreviewingForm] = useState(false);

  // Render route contents with simulated state.
  const singleEventCtx = useMemo((): SingleEventState => {
    const converted = editorEventToServer(values);
    return {
      pending: false,
      event: {
        ...converted,
        id: "preview",
        quotas: converted.quotas.map((quota) => ({
          ...quota,
          id: quota.id ?? `preview${Math.random()}`,
          signupCount: 0,
          signups: [],
        })),
        questions: converted.questions.map((question) => ({
          ...question,
          id: question.id ?? `preview${Math.random()}`,
        })),
        registrationClosed: false,
        millisTillOpening: Infinity,
      },
      preview: { setPreviewingForm },
    };
  }, [values]);

  const editSignupCtx = useMemo(
    (): EditSignupState => ({
      pending: false,
      editToken: "",
      isNew: true,
      event: singleEventCtx.event,
      signup: {
        id: "preview",
        firstName: null,
        lastName: null,
        email: null,
        answers: [],
        confirmed: false,
        createdAt: new Date().toISOString(),
        namePublic: false,
        quota: singleEventCtx.event!.quotas[0] ?? {
          id: `preview${Math.random()}`,
          title: "\u2013",
          size: 0,
        },
        status: SignupStatus.IN_QUOTA,
        position: 1,
        confirmableForMillis: 30 * 60 * 60 * 1000,
        editableForMillis: 30 * 60 * 60 * 1000,
      },
      editingClosedOnLoad: false,
      confirmableUntil: Date.now() + 30 * 60 * 60 * 1000,
      editableUntil: Date.now() + 30 * 60 * 60 * 1000,
      preview: { setPreviewingForm },
    }),
    [singleEventCtx],
  );

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
