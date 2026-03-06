import React, { BaseSyntheticEvent, useMemo, useState } from "react";

import { FormApi } from "final-form";
import arrayMutators from "final-form-arrays";
import { Form as BsForm } from "react-bootstrap";
import { Form, FormRenderProps } from "react-final-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";

import { ApiError, errorDesc } from "@tietokilta/ilmomasiina-client";
import type { TKey } from "../../../i18n";
import { selectFormData, serverEventToEditor } from "../../../modules/editor/selectors";
import type { EditorEvent } from "../../../modules/editor/types";
import useStore from "../../../modules/store";
import paths from "../../../paths";
import convertZodError from "../../../utils/convertZodError";
import useEvent from "../../../utils/useEvent";
import editorSchema from "../schema";
import BasicDetailsTab from "./BasicDetailsTab";
import EditConflictModal from "./EditConflictModal";
import EditorTabBody from "./EditorTabBody";
import EditorTabHeader, { EditorTab } from "./EditorTabHeader";
import EditorToolbar from "./EditorToolbar";
import EditSignupModal from "./EditSignupModal";
import EmailsTab from "./EmailsTab";
import MoveToQueueWarning from "./MoveToQueueWarning";
import PreviewTab from "./PreviewTab";
import QuestionsTab from "./QuestionsTab";
import QuotasTab from "./QuotasTab";
import SignupsTab from "./SignupsTab";

const EditFormBody = ({ form }: FormRenderProps<EditorEvent>) => {
  const [activeTab, setActiveTab] = useState<EditorTab>(EditorTab.BASIC_DETAILS);
  const { t } = useTranslation();

  const isDraft = useStore((state) => state.editor.event?.draft || state.editor.isNew);

  const doSubmit = useEvent(() => {
    // submit() returns a Promise if validation succeeds.
    if (form.submit() == null && form.getState().hasValidationErrors) {
      toast.error(t("editor.saveInvalid"), {
        autoClose: 2000,
      });
    }
  });
  const onSave = useEvent((evt?: BaseSyntheticEvent) => {
    evt?.preventDefault();
    form.change("moveSignupsToQueue", false);
    doSubmit();
  });
  const onSaveToggleDraft = useEvent(() => {
    form.change("moveSignupsToQueue", false);
    form.change("draft", !isDraft);
    doSubmit();
  });
  const onMoveToQueueProceed = useEvent(() => {
    form.change("moveSignupsToQueue", true);
    doSubmit();
  });

  // Memoizing this render step seems to stop everything from rerendering unnecessarily, resulting in
  // an order of magnitude of performance boost.
  return useMemo(
    () => (
      <>
        <BsForm onSubmit={onSave} className="ilmo--form" role="tablist">
          <EditorToolbar onSave={onSave} onSaveToggleDraft={onSaveToggleDraft} />
          <EditorTabHeader activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="tab-content mt-4">
            <EditorTabBody id={EditorTab.BASIC_DETAILS} activeTab={activeTab} component={BasicDetailsTab} />
            <EditorTabBody id={EditorTab.QUOTAS} activeTab={activeTab} component={QuotasTab} />
            <EditorTabBody id={EditorTab.QUESTIONS} activeTab={activeTab} component={QuestionsTab} />
            <EditorTabBody id={EditorTab.EMAILS} activeTab={activeTab} component={EmailsTab} />
            <EditorTabBody id={EditorTab.PREVIEW} activeTab={activeTab} component={PreviewTab} />
            <EditorTabBody id={EditorTab.SIGNUPS} activeTab={activeTab} component={SignupsTab} />
          </div>
        </BsForm>
        <MoveToQueueWarning onProceed={onMoveToQueueProceed} />
        <EditConflictModal onSave={onSave} />
        <EditSignupModal />
      </>
    ),
    [onSave, onSaveToggleDraft, onMoveToQueueProceed, activeTab, setActiveTab],
  );
};

const mutators = {
  ...arrayMutators,
  // The default remove() mutator deletes the entire field if the array becomes empty.
  // This is written based on final-form-arrays's source code to undo that stupidity.
  // See https://github.com/final-form/final-form-arrays/blob/master/src/remove.js
  remove: ([name, index], state, tools) => {
    const returnValue = arrayMutators.remove([name, index], state, tools);
    tools.changeValue(state, name, (value) => value ?? []);
    return returnValue;
  },
} satisfies typeof arrayMutators;

function validate(event: EditorEvent) {
  const result = editorSchema.safeParse(event);
  return result.success ? undefined : convertZodError(result.error);
}

const EditForm = () => {
  const initialValues = useStore(selectFormData);
  const { isNew, event, publishNewEvent, publishEventUpdate } = useStore((state) => state.editor);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const onSubmit = useEvent(async (data: EditorEvent, form: FormApi<EditorEvent>) => {
    try {
      let saved;
      if (isNew) {
        saved = await publishNewEvent(data);
        navigate(paths.adminEditEvent(saved.id));
        toast.success(t("editor.status.createSuccess"), { autoClose: 2000 });
      } else {
        saved = await publishEventUpdate(event!.id, data);
        if (saved) {
          toast.success(t("editor.status.saveSuccess"), { autoClose: 2000 });
        }
      }
      // Update questions/quotas to get IDs from the server
      if (saved) {
        const newFormData = serverEventToEditor(saved);
        form.change("updatedAt", saved.updatedAt);
        form.change("quotas", newFormData.quotas);
        form.change("questions", newFormData.questions);
      }
    } catch (error) {
      toast.error(t(errorDesc<TKey>(error as ApiError, "editor.saveError")), {
        autoClose: 2000,
      });
    }
  });

  return (
    <Form<EditorEvent> onSubmit={onSubmit} initialValues={initialValues} mutators={mutators} validate={validate}>
      {(props) => <EditFormBody {...props} />}
    </Form>
  );
};

export default EditForm;
