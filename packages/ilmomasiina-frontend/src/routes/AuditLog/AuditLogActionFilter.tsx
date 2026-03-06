import React from "react";

import { Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";

import { AuditEvent } from "@tietokilta/ilmomasiina-models";
import useStore from "../../modules/store";

const ACTIONS = [
  [AuditEvent.CREATE_EVENT, "auditLog.filter.action.createEvent"],
  [AuditEvent.EDIT_EVENT, "auditLog.filter.action.editEvent"],
  [AuditEvent.PUBLISH_EVENT, "auditLog.filter.action.publishEvent"],
  [AuditEvent.UNPUBLISH_EVENT, "auditLog.filter.action.unpublishEvent"],
  [AuditEvent.DELETE_EVENT, "auditLog.filter.action.deleteEvent"],
  [AuditEvent.CREATE_SIGNUP, "auditLog.filter.action.createSignup"],
  [AuditEvent.EDIT_SIGNUP, "auditLog.filter.action.editSignup"],
  [AuditEvent.DELETE_SIGNUP, "auditLog.filter.action.deleteSignup"],
  [AuditEvent.PROMOTE_SIGNUP, "auditLog.filter.action.promoteSignup"],
  [AuditEvent.CREATE_USER, "auditLog.filter.action.createUser"],
  [AuditEvent.DELETE_USER, "auditLog.filter.action.deleteUser"],
  [AuditEvent.RESET_PASSWORD, "auditLog.filter.action.resetPassword"],
  [AuditEvent.CHANGE_PASSWORD, "auditLog.filter.action.changeOwnPassword"],
] as const;

const AuditLogActionFilter = () => {
  const setAuditLogQueryField = useStore((state) => state.auditLog.setAuditLogQueryField);
  const { t } = useTranslation();

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Since e.target.value comes from the <select> below, we can assume the type
    const event = e.target.value ? [e.target.value as AuditEvent] : undefined;
    setAuditLogQueryField("action", event);
  };

  return (
    <Form.Select onChange={onChange}>
      <option value="">{t("auditLog.filter.action")}</option>
      {ACTIONS.map(([key, label]) => (
        <option value={key} key={key}>
          {t(label)}
        </option>
      ))}
    </Form.Select>
  );
};

export default AuditLogActionFilter;
