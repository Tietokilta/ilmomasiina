import React from 'react';

import { Form } from 'react-bootstrap';

import { AuditEvent } from '@tietokilta/ilmomasiina-models';
import { setAuditLogQueryField } from '../../modules/auditLog/actions';
import { useTypedDispatch } from '../../store/reducers';

const ACTIONS = [
  [AuditEvent.CREATE_EVENT, 'Event: Create'],
  [AuditEvent.EDIT_EVENT, 'Event: Edit'],
  [AuditEvent.PUBLISH_EVENT, 'Event: Publish'],
  [AuditEvent.UNPUBLISH_EVENT, 'Event: Un-publish'],
  [AuditEvent.DELETE_EVENT, 'Event: Delete'],
  [AuditEvent.EDIT_SIGNUP, 'Sign-up: Edit'],
  [AuditEvent.DELETE_SIGNUP, 'Sign-up: Delete'],
  [AuditEvent.PROMOTE_SIGNUP, 'Sign-up: Promote'],
  [AuditEvent.CREATE_USER, 'User: Create'],
  [AuditEvent.DELETE_USER, 'User: Delete'],
];

const AuditLogActionFilter = () => {
  const dispatch = useTypedDispatch();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Since e.target.value comes from the <select> below, we can assume the type
    const event = e.target.value ? [e.target.value as AuditEvent] : undefined;
    dispatch(setAuditLogQueryField('action', event));
  };

  return (
    <Form.Control
      as="select"
      onChange={onChange}
    >
      <option value="">Action&hellip;</option>
      {ACTIONS.map(([key, label]) => (
        <option value={key} key={key}>{label}</option>
      ))}
    </Form.Control>
  );
};

export default AuditLogActionFilter;
