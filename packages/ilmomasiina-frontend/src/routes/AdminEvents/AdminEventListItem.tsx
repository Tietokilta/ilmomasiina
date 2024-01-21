import React, { MouseEvent } from 'react';

import sumBy from 'lodash-es/sumBy';
import moment from 'moment-timezone';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { ApiError } from '@tietokilta/ilmomasiina-components';
import { errorDesc } from '@tietokilta/ilmomasiina-components/dist/utils/errorMessage';
import type { AdminEventListItem as AdminEventListItemSchema } from '@tietokilta/ilmomasiina-models';
import { deleteEvent, getAdminEvents } from '../../modules/adminEvents/actions';
import appPaths from '../../paths';
import { useTypedDispatch } from '../../store/reducers';
import { isEventInPast } from '../../utils/eventState';

type Props = {
  event: AdminEventListItemSchema;
};

const AdminEventListItem = ({ event }: Props) => {
  const dispatch = useTypedDispatch();

  const {
    id, title, slug, date, draft, listed, quotas,
  } = event;

  const { t } = useTranslation();

  async function onDelete(e: MouseEvent) {
    e.preventDefault();
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(t('adminEvents.action.delete.confirm'));
    if (confirmed) {
      try {
        await dispatch(deleteEvent(id));
      } catch (err) {
        toast.error(errorDesc(t, err as ApiError, 'adminEvents.action.delete.error'), { autoClose: 2000 });
      } finally {
        dispatch(getAdminEvents());
      }
    }
  }

  let status;
  if (draft) {
    status = t('adminEvents.status.draft');
  } else if (isEventInPast(event)) {
    status = date === null ? t('adminEvents.status.closed') : t('adminEvents.status.ended');
  } else if (!listed) {
    status = t('adminEvents.status.hidden');
  } else {
    status = <Link to={appPaths.eventDetails(slug)}>{t('adminEvents.status.published')}</Link>;
  }

  return (
    <tr>
      <td>
        <Link to={appPaths.adminEditEvent(id)}>{title}</Link>
      </td>
      <td>{date ? moment(date).tz(TIMEZONE).format('DD.MM.YYYY') : ''}</td>
      <td>{status}</td>
      <td>{sumBy(quotas, 'signupCount')}</td>
      <td>
        <Link to={appPaths.adminEditEvent(id)}>
          {t('adminEvents.action.edit')}
        </Link>
        &ensp;/&ensp;
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a href="#" onClick={onDelete} role="button">
          {t('adminEvents.action.delete')}
        </a>
      </td>
    </tr>
  );
};

export default AdminEventListItem;
