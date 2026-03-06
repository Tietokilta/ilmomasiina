import React, { ChangeEvent } from "react";

import { Button, Form } from "react-bootstrap";
import { Trans, useTranslation } from "react-i18next";

import useStore from "../../modules/store";
import useEvent from "../../utils/useEvent";

export const LOGS_PER_PAGE = 100;

const AuditLogPagination = () => {
  const { query, auditLog, setAuditLogQueryField } = useStore((state) => state.auditLog);
  const { t } = useTranslation();

  const value = query.offset || 0;
  const perPage = query.limit || LOGS_PER_PAGE;

  const previousPage = useEvent(() => {
    setAuditLogQueryField("offset", Math.max(0, value - perPage));
  });
  const nextPage = useEvent(() => {
    setAuditLogQueryField("offset", value + perPage);
  });
  const onOffsetChange = useEvent((e: ChangeEvent<HTMLInputElement>) => {
    const newOffset = Number(e.target.value) - 1;
    if (newOffset >= 0) setAuditLogQueryField("offset", newOffset);
  });

  return (
    <nav className="audit-log--pagination mb-3">
      <Button
        className="me-3"
        type="button"
        onClick={previousPage}
        aria-label={t("auditLog.pagination.previous")}
        disabled={value <= 0}
      >
        &laquo;
      </Button>
      <Trans t={t} i18nKey="auditLog.pagination">
        {"Rows\u00A0"}
        <Form.Control type="number" value={value + 1} onChange={onOffsetChange} />
        &ndash;
        {{ last: Math.min(value + perPage, auditLog?.count ?? value + perPage) }}
        {" out of "}
        {{ total: auditLog?.count ?? "?" }}
      </Trans>
      <Button
        className="ms-3"
        type="button"
        onClick={nextPage}
        aria-label={t("auditLog.pagination.next")}
        disabled={!auditLog || value + perPage >= auditLog.count}
      >
        &raquo;
      </Button>
    </nav>
  );
};

export default AuditLogPagination;
