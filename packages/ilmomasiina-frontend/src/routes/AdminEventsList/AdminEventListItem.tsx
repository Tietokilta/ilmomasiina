import React, { MouseEvent } from "react";

import sumBy from "lodash-es/sumBy";
import { Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { ApiError } from "@tietokilta/ilmomasiina-client";
import { errorDesc } from "@tietokilta/ilmomasiina-client/dist/utils/errorMessage";
import type { AdminEventListItem as AdminEventListItemSchema } from "@tietokilta/ilmomasiina-models";
import LinkButton from "../../components/LinkButton";
import type { TKey } from "../../i18n";
import useStore from "../../modules/store";
import paths from "../../paths";
import { useEventDateFormatter } from "../../utils/dateFormat";
import { isEventHiddenFromUsersDueToAge } from "../../utils/eventState";

type Props = {
  event: AdminEventListItemSchema;
};

const AdminEventListItem = ({ event }: Props) => {
  const { deleteEvent, getAdminEvents } = useStore((state) => state.adminEvents);

  const { id, title, slug, date, draft, listed, quotas } = event;

  const { t } = useTranslation();
  const eventDateFormat = useEventDateFormatter();

  async function onDelete(e: MouseEvent) {
    e.preventDefault();
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(t("adminEvents.action.delete.confirm"));
    if (confirmed) {
      try {
        await deleteEvent(id);
      } catch (err) {
        toast.error(t(errorDesc<TKey>(err as ApiError, "adminEvents.action.delete.error")), {
          autoClose: 2000,
        });
      } finally {
        getAdminEvents();
      }
    }
  }

  let status;
  if (draft) {
    status = t("adminEvents.status.draft");
  } else if (isEventHiddenFromUsersDueToAge(event)) {
    status = date === null ? t("adminEvents.status.closed") : t("adminEvents.status.ended");
  } else if (!listed) {
    status = <Link to={paths.eventDetails(slug)}>{t("adminEvents.status.hidden")}</Link>;
  } else {
    status = <Link to={paths.eventDetails(slug)}>{t("adminEvents.status.published")}</Link>;
  }

  return (
    <tr>
      <td>
        <Link to={paths.adminEditEvent(id)}>{title}</Link>
      </td>
      <td>{date ? eventDateFormat.format(new Date(date)) : ""}</td>
      <td>{status}</td>
      <td>{sumBy(quotas, "signupCount")}</td>
      <td>
        <LinkButton variant="primary" size="sm" className="me-1" to={paths.adminEditEvent(id)}>
          {t("adminEvents.action.edit")}
        </LinkButton>
        <LinkButton variant="primary" size="sm" className="me-1" to={paths.adminCopyEvent(id)}>
          {t("adminEvents.action.copy")}
        </LinkButton>
        <Button variant="danger" size="sm" onClick={onDelete}>
          {t("adminEvents.action.delete")}
        </Button>
      </td>
    </tr>
  );
};

export default AdminEventListItem;
