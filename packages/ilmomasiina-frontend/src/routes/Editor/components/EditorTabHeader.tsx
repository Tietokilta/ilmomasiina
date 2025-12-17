import React, { useCallback } from "react";

import { Nav } from "react-bootstrap";
import { useFormState } from "react-final-form";
import { useTranslation } from "react-i18next";

import { EditorEvent, EditorEventType } from "../../../modules/editor/types";
import { useFieldValue } from "./hooks";

export enum EditorTab {
  BASIC_DETAILS = "basic",
  QUOTAS = "quotas",
  QUESTIONS = "questions",
  EMAILS = "emails",
  PREVIEW = "preview",
  SIGNUPS = "signups",
}

const tabTitles = {
  [EditorTab.BASIC_DETAILS]: "editor.tabs.basic",
  [EditorTab.QUOTAS]: "editor.tabs.quotas",
  [EditorTab.QUESTIONS]: "editor.tabs.questions",
  [EditorTab.EMAILS]: "editor.tabs.emails",
  [EditorTab.PREVIEW]: "editor.tabs.preview",
  [EditorTab.SIGNUPS]: "editor.tabs.signups",
} as const;

const needSignup = [EditorTab.QUOTAS, EditorTab.QUESTIONS, EditorTab.EMAILS, EditorTab.SIGNUPS];

const tabForField: Record<keyof EditorEvent, EditorTab | null> = {
  title: EditorTab.BASIC_DETAILS,
  slug: EditorTab.BASIC_DETAILS,
  eventType: EditorTab.BASIC_DETAILS,
  date: EditorTab.BASIC_DETAILS,
  endDate: EditorTab.BASIC_DETAILS,
  registrationStartDate: EditorTab.BASIC_DETAILS,
  registrationEndDate: EditorTab.BASIC_DETAILS,
  useOpenQuota: EditorTab.QUOTAS,
  openQuotaSize: EditorTab.QUOTAS,
  category: EditorTab.BASIC_DETAILS,
  description: EditorTab.BASIC_DETAILS,
  price: EditorTab.BASIC_DETAILS,
  location: EditorTab.BASIC_DETAILS,
  webpageUrl: EditorTab.BASIC_DETAILS,
  facebookUrl: EditorTab.BASIC_DETAILS,
  signupsPublic: EditorTab.BASIC_DETAILS,
  nameQuestion: EditorTab.QUESTIONS,
  emailQuestion: EditorTab.QUESTIONS,
  draft: EditorTab.BASIC_DETAILS,
  listed: EditorTab.BASIC_DETAILS,
  verificationEmail: EditorTab.EMAILS,
  quotas: EditorTab.QUOTAS,
  questions: EditorTab.QUESTIONS,
  languages: EditorTab.BASIC_DETAILS,
  defaultLanguage: EditorTab.BASIC_DETAILS,
  moveSignupsToQueue: null,
  updatedAt: null,
};

type TabProps = Props & {
  id: EditorTab;
};

const Tab = ({ id, activeTab, setActiveTab }: TabProps) => {
  const { t } = useTranslation();
  const { errors } = useFormState({ subscription: { errors: true } });
  const hasErrors =
    errors != null &&
    Object.entries(errors).some(([field, error]) => error && tabForField[field as keyof EditorEvent] === id);

  const onClick = useCallback(() => setActiveTab(id), [id, setActiveTab]);

  return (
    <Nav.Item>
      <Nav.Link
        eventKey={id}
        onClick={onClick}
        role="tab"
        aria-selected={activeTab === id}
        aria-controls={`editor-tab-${id}`}
      >
        {t(tabTitles[id])}
        {hasErrors && <span className="event-editor--tab-error" />}
      </Nav.Link>
    </Nav.Item>
  );
};

type Props = {
  activeTab: EditorTab;
  setActiveTab: (tab: EditorTab) => void;
};

const EditorTabHeader = ({ activeTab, setActiveTab }: Props) => {
  const eventType = useFieldValue<EditorEventType>("eventType");

  return (
    <Nav variant="tabs" activeKey={activeTab} role="tablist">
      {Object.values(EditorTab)
        // Only show some tabs for ONLY_EVENT events.
        .filter((id) => eventType !== EditorEventType.ONLY_EVENT || !needSignup.includes(id))
        .map((id) => (
          <Tab key={id} id={id} activeTab={activeTab} setActiveTab={setActiveTab} />
        ))}
    </Nav>
  );
};

export default EditorTabHeader;
