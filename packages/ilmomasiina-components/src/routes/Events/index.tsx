import React, { useMemo } from 'react';

import { Spinner, Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { ErrorCode } from '@tietokilta/ilmomasiina-models';
import { timezone } from '../../config';
import { linkComponent, Navigate } from '../../config/router';
import { usePaths } from '../../contexts/paths';
import { I18nProvider } from '../../i18n';
import { EventListProps, EventListProvider, useEventListContext } from '../../modules/events';
import { errorDesc, errorTitle } from '../../utils/errorMessage';
import {
  EventRow, eventsToRows, QuotaRow,
} from '../../utils/eventListUtils';
import { useSignupStateText } from '../../utils/signupStateText';
import TableRow from './components/TableRow';

const ListEventRow = ({
  row: {
    slug, title, date, signupState, signupCount, quotaSize,
  },
}: { row: EventRow }) => {
  const Link = linkComponent();
  const paths = usePaths();
  const stateText = useSignupStateText(signupState);
  return (
    <TableRow
      className={stateText.class}
      title={<Link to={paths.eventDetails(slug)}>{title}</Link>}
      date={date ? date.tz(timezone()).format('DD.MM.YYYY') : ''}
      signupStatus={stateText}
      signupCount={signupCount}
      quotaSize={quotaSize}
    />
  );
};

const ListQuotaRow = ({
  row: {
    type, title, signupCount, quotaSize,
  },
}: { row: QuotaRow }) => {
  const { t } = useTranslation();
  return (
    <TableRow
      className="ilmo--quota-row"
      title={type === 'openquota' ? t('events.openQuota') : title}
      signupCount={signupCount}
      quotaSize={quotaSize}
    />
  );
};

const EventListView = () => {
  const { events, error, pending } = useEventListContext();
  const { t } = useTranslation();
  const paths = usePaths();
  const tableRows = useMemo(() => eventsToRows(events).filter((row) => row.type !== 'waitlist'), [events]);
  // If initial setup is needed and is possible on this frontend, redirect to that page.
  if (error && error.code === ErrorCode.INITIAL_SETUP_NEEDED && paths.hasAdmin) {
    return <Navigate to={paths.adminInitialSetup} />;
  }

  if (error) {
    return (
      <>
        <h1>{errorTitle(t, error, 'events.loadError')}</h1>
        <p>{errorDesc(t, error, 'events.loadError')}</p>
      </>
    );
  }

  if (pending) {
    return (
      <>
        <h1>{t('events.title')}</h1>
        <Spinner animation="border" />
      </>
    );
  }

  return (
    <>
      <h1>{t('events.title')}</h1>
      <Table className="ilmo--event-list">
        <thead>
          <tr>
            <th>{t('events.column.name')}</th>
            <th>{t('events.column.date')}</th>
            <th>{t('events.column.signupStatus')}</th>
            <th>{t('events.column.signupCount')}</th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row) => (row.type === 'event'
            ? <ListEventRow key={row.id} row={row} />
            : <ListQuotaRow key={row.id} row={row} />))}

        </tbody>
      </Table>
    </>
  );
};

const EventList = ({ category }: EventListProps) => (
  <EventListProvider category={category}>
    <I18nProvider>
      <EventListView />
    </I18nProvider>
  </EventListProvider>
);

export default EventList;
