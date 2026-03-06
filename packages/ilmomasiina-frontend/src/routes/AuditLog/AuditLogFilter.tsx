import React from "react";

import { Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";

import type { AuditLoqQuery } from "@tietokilta/ilmomasiina-models";
import useStore from "../../modules/store";
import useThrottled from "../../utils/useThrottled";

const UPDATE_DELAY = 500;

type Props = Omit<React.ComponentProps<typeof Form.Control>, "name" | "value" | "onChange"> & {
  name: keyof AuditLoqQuery;
};

const AuditLogFilter = ({ name, ...props }: Props) => {
  const setAuditLogQueryField = useStore((state) => state.auditLog.setAuditLogQueryField);
  const { t } = useTranslation();

  const onChange = useThrottled((e: React.ChangeEvent<HTMLInputElement>) => {
    setAuditLogQueryField(name, e.target.value);
  }, UPDATE_DELAY);

  return <Form.Control type="text" name={name} onChange={onChange} placeholder={t("auditLog.filter")} {...props} />;
};

export default AuditLogFilter;
