import React, { MouseEvent } from 'react';

import sumBy from 'lodash/sumBy';
import moment from 'moment-timezone';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

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

  async function onDelete(e: MouseEvent) {
    e.preventDefault();
    const confirmed = window.confirm(
      'Want to delete this event? This action cannot be undone.',
    );
    if (confirmed) {
      const success = await dispatch(deleteEvent(id));
      if (!success) {
        toast.error('The removal failed :(', { autoClose: 2000 });
      }
      dispatch(getAdminEvents());
    }
  }

  let status;
  if (draft) {
    status = 'Draft';
  } else if (isEventInPast(event)) {
    status = date === null ? 'Closed' : 'Gone';
  } else if (!listed) {
    status = 'Hidden';
  } else {
    status = <Link to={appPaths.eventDetails(slug)}>Published</Link>;
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
          Edit the event
        </Link>
        &ensp;/&ensp;
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a href="#" onClick={onDelete} role="button">
          Remove the event
        </a>
      </td>
    </tr>
  );
};

export default AdminEventListItem;
