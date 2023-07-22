import React from 'react';

import moment from 'moment-timezone';
import { Link } from 'react-router-dom';

import type { AuditLogItemSchema } from '@tietokilta/ilmomasiina-models';
import { AuditEvent } from '@tietokilta/ilmomasiina-models';
import appPaths from '../../paths';

type Props = {
  item: AuditLogItemSchema;
};

const ACTION_STRINGS: Record<AuditEvent, string> = {
  [AuditEvent.CREATE_EVENT]: 'created an event ',
  [AuditEvent.EDIT_EVENT]: 'edited the event ',
  [AuditEvent.PUBLISH_EVENT]: 'published the event ',
  [AuditEvent.UNPUBLISH_EVENT]: 'unpublished the event ',
  [AuditEvent.DELETE_EVENT]: 'deleted the event ',
  [AuditEvent.EDIT_SIGNUP]: 'edited the sign-up ',
  [AuditEvent.DELETE_SIGNUP]: 'deleted the sign-up ',
  [AuditEvent.PROMOTE_SIGNUP]: 'promoted the sign-up: ',
  [AuditEvent.CREATE_USER]: 'created the user ',
  [AuditEvent.DELETE_USER]: 'removed the user ',
  [AuditEvent.RESET_PASSWORD]: 'reset the password to the user ',
  [AuditEvent.CHANGE_PASSWORD]: 'changed their password',
};

function describeAction(item: AuditLogItemSchema) {
  let extra: any = {};
  try {
    extra = JSON.parse(item.extra || '');
  } catch (err) { /* ignore */ }
  switch (item.action) {
    case AuditEvent.CREATE_EVENT:
    case AuditEvent.EDIT_EVENT:
    case AuditEvent.PUBLISH_EVENT:
    case AuditEvent.UNPUBLISH_EVENT:
    case AuditEvent.DELETE_EVENT:
      return (
        <>
          {ACTION_STRINGS[item.action]}
          {item.eventId && <Link to={appPaths.adminEditEvent(item.eventId)}>{item.eventName}</Link>}
        </>
      );
    case AuditEvent.EDIT_SIGNUP:
    case AuditEvent.DELETE_SIGNUP:
    case AuditEvent.PROMOTE_SIGNUP:
      return (
        <>
          {`${ACTION_STRINGS[item.action]}${item.signupId} (${item.signupName}) at the event `}
          {item.eventId && <Link to={appPaths.adminEditEvent(item.eventId)}>{item.eventName}</Link>}
        </>
      );
    case AuditEvent.CREATE_USER:
    case AuditEvent.DELETE_USER:
    case AuditEvent.RESET_PASSWORD:
      return `${ACTION_STRINGS[item.action]}${extra.email}`;
    default:
      return ACTION_STRINGS[item.action] ?? `unknown ${item.action}`;
  }
}

const AuditLogItem = ({ item }: Props) => (
  <tr>
    <td>{moment(item.createdAt).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}</td>
    <td>{item.user || '-'}</td>
    <td>{item.ipAddress || '-'}</td>
    <td>{describeAction(item)}</td>
  </tr>
);

export default AuditLogItem;
