import React, { useCallback } from 'react';

import { Nav } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { EditorEventType } from '../../../modules/editor/types';
import { useFieldValue } from './hooks';

export enum EditorTab {
  BASIC_DETAILS = 'basic',
  QUOTAS = 'quotas',
  QUESTIONS = 'questions',
  EMAILS = 'emails',
  SIGNUPS = 'signups',
}

const tabTitles = {
  [EditorTab.BASIC_DETAILS]: 'editor.tabs.basic',
  [EditorTab.QUOTAS]: 'editor.tabs.quotas',
  [EditorTab.QUESTIONS]: 'editor.tabs.questions',
  [EditorTab.EMAILS]: 'editor.tabs.emails',
  [EditorTab.SIGNUPS]: 'editor.tabs.signups',
} as const;

type TabProps = Props & {
  id: EditorTab;
};

const Tab = ({
  id, activeTab, setActiveTab,
}: TabProps) => {
  const { t } = useTranslation();
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
      </Nav.Link>
    </Nav.Item>
  );
};

type Props = {
  activeTab: EditorTab;
  setActiveTab: (tab: EditorTab) => void
};

const EditorTabHeader = ({ activeTab, setActiveTab }: Props) => {
  const eventType = useFieldValue<EditorEventType>('eventType');

  return (
    <Nav variant="tabs" activeKey={activeTab} role="tablist">
      {Object.values(EditorTab)
        // Only show Basic details for ONLY_EVENT events.
        .filter((id) => id === EditorTab.BASIC_DETAILS || eventType !== EditorEventType.ONLY_EVENT)
        .map((id) => <Tab key={id} id={id} activeTab={activeTab} setActiveTab={setActiveTab} />)}
    </Nav>
  );
};

export default EditorTabHeader;
