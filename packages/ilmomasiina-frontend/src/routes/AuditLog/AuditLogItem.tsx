import React from 'react';

import moment from 'moment-timezone';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { AuditLogItemSchema } from '@tietokilta/ilmomasiina-models';
import { AuditEvent } from '@tietokilta/ilmomasiina-models';
import appPaths from '../../paths';

type Props = {
  item: AuditLogItemSchema;
};

const ACTION_STRINGS = {
  [AuditEvent.CREATE_EVENT]: 'auditLog.description.createEvent',
  [AuditEvent.EDIT_EVENT]: 'auditLog.description.editEvent',
  [AuditEvent.PUBLISH_EVENT]: 'auditLog.description.publishEvent',
  [AuditEvent.UNPUBLISH_EVENT]: 'auditLog.description.unpublishEvent',
  [AuditEvent.DELETE_EVENT]: 'auditLog.description.deleteEvent',
  [AuditEvent.EDIT_SIGNUP]: 'auditLog.description.editSignup',
  [AuditEvent.DELETE_SIGNUP]: 'auditLog.description.deleteSignup',
  [AuditEvent.PROMOTE_SIGNUP]: 'auditLog.description.promoteSignup',
  [AuditEvent.CREATE_USER]: 'auditLog.description.createUser',
  [AuditEvent.DELETE_USER]: 'auditLog.description.deleteUser',
  [AuditEvent.RESET_PASSWORD]: 'auditLog.description.resetPassword',
  [AuditEvent.CHANGE_PASSWORD]: 'auditLog.description.changeOwnPassword',
} as const;

function useItemDescription(item: AuditLogItemSchema) {
  const { t } = useTranslation();
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
        <Trans t={t} i18nKey={ACTION_STRINGS[item.action]}>
          created event
          {item.eventId
            ? <Link to={appPaths.adminEditEvent(item.eventId as any)}>{{ event: item.eventName ?? '' }}</Link>
            : { event: item.eventName ?? '' }}
        </Trans>
      );
    case AuditEvent.EDIT_SIGNUP:
    case AuditEvent.DELETE_SIGNUP:
    case AuditEvent.PROMOTE_SIGNUP:
      return (
        <Trans t={t} i18nKey={ACTION_STRINGS[item.action]}>
          edited signup
          {{ signup: `${item.signupId} (${item.signupName})` }}
          in event
          {item.eventId
            ? <Link to={appPaths.adminEditEvent(item.eventId)}>{{ event: item.eventName ?? '' }}</Link>
            : { event: item.eventName ?? '' }}
        </Trans>
      );
    case AuditEvent.CREATE_USER:
    case AuditEvent.DELETE_USER:
    case AuditEvent.RESET_PASSWORD:
      return t(ACTION_STRINGS[item.action], { user: extra.email });
    default:
      return ACTION_STRINGS[item.action]
        ? t(ACTION_STRINGS[item.action])
        : t('auditLog.description.unknown', { action: item.action });
  }
}

const AuditLogItem = ({ item }: Props) => {
  const desc = useItemDescription(item);
  return (
    <tr>
      <td>{moment(item.createdAt).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}</td>
      <td>{item.user || '-'}</td>
      <td>{item.ipAddress || '-'}</td>
      <td>{desc}</td>
    </tr>
  );
};

export default AuditLogItem;
