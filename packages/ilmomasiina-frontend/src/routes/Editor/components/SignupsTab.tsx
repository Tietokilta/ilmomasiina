import React, { ChangeEvent, Fragment, useCallback, useMemo, useState } from "react";

import { Badge, Button, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";

import { stringifyAnswer } from "@tietokilta/ilmomasiina-client/dist/utils/signupUtils";
import { AdminEventResponse, PaymentMode, SignupPaymentStatus, SignupStatus } from "@tietokilta/ilmomasiina-models";
import type { AdminSignupWithQuota } from "../../../modules/editor/types";
import useStore from "../../../modules/store";
import { useActionDateTimeFormatter } from "../../../utils/dateFormat";
import { usePriceFormatter } from "../../../utils/priceFormat";
import useEvent from "../../../utils/useEvent";
import CSVLink, { CSVOptions } from "./CSVLink";
import {
  getAnswersFromSignup,
  getSignupsByQuotaForAdminList,
  getSignupsForAdminList,
  useConvertSignupsToCSV,
} from "./formatSignups";

import "../Editor.scss";

const paymentStatusVariant: Record<SignupPaymentStatus, string> = {
  [SignupPaymentStatus.PENDING]: "warning",
  [SignupPaymentStatus.PAID]: "success",
  [SignupPaymentStatus.REFUNDED]: "secondary",
};

type SignupProps = {
  position: number;
  signup: AdminSignupWithQuota;
  showQuota: boolean;
};

const SignupRow = ({ position, signup, showQuota }: SignupProps) => {
  const { editSignup, deleteSignup, getEvent } = useStore((state) => state.editor);
  const event = useStore((state) => state.editor.event!);
  const { t } = useTranslation();
  const actionDateFormat = useActionDateTimeFormatter();

  const answersMap = useMemo(() => getAnswersFromSignup(event, signup), [event, signup]);

  const onEdit = useEvent(() => editSignup(signup));
  const onDelete = useEvent(async () => {
    // eslint-disable-next-line no-alert
    const confirmation = window.confirm(t("editor.signups.action.delete.confirm"));
    if (confirmation) {
      await deleteSignup(signup.id!);
      getEvent(event.id);
    }
  });

  const nameEmailCols = (event.nameQuestion ? 2 : 0) + (event.emailQuestion ? 1 : 0);

  const signupStatus =
    signup.status && signup.status !== SignupStatus.IN_QUOTA
      ? t(`editor.signups.column.status.${signup.status}`)
      : null;

  const formatPrice = usePriceFormatter(signup.currency ?? CURRENCY);
  const isDeleted = Boolean(signup.deletedAt);

  return (
    <tr className={`${!signup.confirmed ? "ilmo--unconfirmed" : ""} ${isDeleted ? "ilmo--deleted" : ""}`}>
      <td key="position">{`${position}.`}</td>
      {signup.confirmed && event.nameQuestion && <td key="firstName">{signup.firstName}</td>}
      {signup.confirmed && event.nameQuestion && <td key="lastName">{signup.lastName}</td>}
      {signup.confirmed && event.emailQuestion && <td key="email">{signup.email}</td>}
      {!signup.confirmed && nameEmailCols && (
        <td colSpan={nameEmailCols} className="fst-italic">
          {t("editor.signups.unconfirmed")}
        </td>
      )}
      {showQuota && (
        <td key="quota">{signupStatus ? `${signup.quota.title} (${signupStatus})` : signup.quota.title}</td>
      )}
      {event.questions.map((question) => (
        <td key={question.id}>{stringifyAnswer(answersMap[question.id])}</td>
      ))}
      <td key="timestamp">{actionDateFormat.format(new Date(signup.createdAt))}</td>
      {event.payments !== PaymentMode.DISABLED && (
        <td key="price">{signup.price != null && formatPrice(signup.price)}</td>
      )}
      {event.payments !== PaymentMode.DISABLED && (
        <td key="paymentStatus">
          {signup.paymentStatus && (
            <Badge bg={paymentStatusVariant[signup.paymentStatus]}>
              {t(`editor.signups.column.paymentStatus.${signup.paymentStatus}`)}
            </Badge>
          )}
        </td>
      )}
      <td key="actions">
        {!isDeleted ? (
          <>
            <Button type="button" variant="primary" size="sm" onClick={onEdit}>
              {t("editor.signups.action.edit")}
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={onDelete} className="ms-1">
              {t("editor.signups.action.delete")}
            </Button>
          </>
        ) : (
          <span>{t("editor.signups.deleted")}</span>
        )}
      </td>
    </tr>
  );
};

type TableProps = {
  event: AdminEventResponse;
  signups: AdminSignupWithQuota[];
  showQuota: boolean;
};

type SortKey = "createdAt" | "firstName" | "lastName" | "price" | { type: "answer"; questionId: string };

type SortState = {
  key: SortKey;
  dir: "asc" | "desc";
};

const compareNullableString = (a?: string | null, b?: string | null) => {
  const av = (a ?? "").trim();
  const bv = (b ?? "").trim();

  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;

  return av.localeCompare(bv, undefined, { sensitivity: "base", numeric: true });
};

const compareNullableNumber = (a?: number | null, b?: number | null) => {
  const av = a ?? null;
  const bv = b ?? null;

  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;

  return av - bv;
};

const SignupTable = ({ event, signups, showQuota }: TableProps) => {
  const { t } = useTranslation();

  const [sort, setSort] = useState<SortState>({ key: "createdAt", dir: "asc" });

  const toggleSort = useCallback((key: SortKey) => {
    setSort((prev) => {
      const sameKey =
        typeof prev.key === "string" && typeof key === "string"
          ? prev.key === key
          : typeof prev.key === "object" &&
            typeof key === "object" &&
            prev.key.type === key.type &&
            prev.key.questionId === key.questionId;

      if (!sameKey) return { key, dir: "asc" };
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  }, []);

  const signupsSorted = useMemo(() => {
    const dirMul = sort.dir === "asc" ? 1 : -1;

    const decorated = signups.map((signup, index) => ({ signup, index }));

    decorated.sort((a, b) => {
      const sa = a.signup;
      const sb = b.signup;

      let cmp = 0;

      if (sort.key === "firstName") cmp = compareNullableString(sa.firstName, sb.firstName);
      else if (sort.key === "lastName") cmp = compareNullableString(sa.lastName, sb.lastName);
      else if (sort.key === "createdAt") cmp = compareNullableString(sa.createdAt, sb.createdAt);
      else if (sort.key === "price") cmp = compareNullableNumber(sa.price, sb.price);
      else if (typeof sort.key === "object" && sort.key.type === "answer") {
        const qid = sort.key.questionId;
        const aMap = getAnswersFromSignup(event, sa);
        const bMap = getAnswersFromSignup(event, sb);
        cmp = compareNullableString(stringifyAnswer(aMap[qid]), stringifyAnswer(bMap[qid]));
      }

      if (cmp !== 0) return cmp * dirMul;

      // Deterministic tie-breakers: createdAt, id, original order (stable fallback)
      cmp = compareNullableString(sa.createdAt, sb.createdAt);
      if (cmp !== 0) return cmp;

      cmp = compareNullableString(sa.id ?? null, sb.id ?? null);
      if (cmp !== 0) return cmp;

      return a.index - b.index;
    });

    return decorated.map((d) => d.signup);
  }, [event, signups, sort]);

  if (!signups.length) return <p>{t("editor.signups.emptyQuota")}</p>;

  return (
    <table className="event-editor--signup-table table table-condensed table-responsive">
      <thead>
        <tr className="active">
          <th key="position">#</th>
          {event.nameQuestion && (
            <th key="firstName" onClick={() => toggleSort("firstName")}>
              {t("editor.signups.column.firstName")}
            </th>
          )}
          {event.nameQuestion && (
            <th key="lastName" onClick={() => toggleSort("lastName")}>
              {t("editor.signups.column.lastName")}
            </th>
          )}
          {event.emailQuestion && <th key="email">{t("editor.signups.column.email")}</th>}
          {showQuota && <th key="quota">{t("editor.signups.column.quota")}</th>}
          {event.questions.map((q) => (
            <th key={q.id} onClick={() => toggleSort({ type: "answer", questionId: q.id })}>
              {q.question}
            </th>
          ))}
          <th key="timestamp" onClick={() => toggleSort("createdAt")}>
            {t("editor.signups.column.time")}
          </th>
          {event.payments !== PaymentMode.DISABLED && (
            <th key="price" onClick={() => toggleSort("price")}>
              {t("editor.signups.column.price")}
            </th>
          )}
          {event.payments !== PaymentMode.DISABLED && (
            <th key="paymentStatus">{t("editor.signups.column.paymentStatus")}</th>
          )}
          <th key="actions" aria-label={t("editor.signups.column.actions")} />
        </tr>
      </thead>
      <tbody>
        {signupsSorted.map((signup, index) => (
          <SignupRow key={signup.id} position={index + 1} signup={signup} showQuota={showQuota} />
        ))}
      </tbody>
    </table>
  );
};

const csvOptions: CSVOptions = { delimiter: "\t" };

const SignupsTab = () => {
  const { event, editNewSignup } = useStore((state) => state.editor);

  const signups = useMemo(() => event && getSignupsForAdminList(event), [event]);
  const signupsByQuota = useMemo(() => event && getSignupsByQuotaForAdminList(event), [event]);
  const csvSignups = useConvertSignupsToCSV(event, signups);

  const [grouped, setGrouped] = useState(false);
  const onGroupedChange = useCallback(
    (evt: ChangeEvent<HTMLInputElement>) => setGrouped(evt.currentTarget.checked),
    [],
  );

  const {
    t,
    i18n: { language },
  } = useTranslation();

  const createSignup = useEvent(() => editNewSignup(language));

  if (!event || !event.quotas.length) {
    return <p>{t("editor.signups.noQuotas")}</p>;
  }

  const isSingleQuota = event.quotas.length <= 1;

  return (
    <div>
      <nav className="mb-3 ilmo--title-nav">
        <Form.Check
          id="groupByQuota"
          label={t("editor.signups.groupByQuota")}
          checked={grouped}
          onChange={onGroupedChange}
        />
        <div className="ilmo--title-nav-buttons">
          <Button variant="primary" onClick={createSignup}>
            {t("editor.signups.action.create")}
          </Button>
          <CSVLink
            data={csvSignups!}
            csvOptions={csvOptions}
            download={t("editor.signups.download.filename", { event: event.title })}
          >
            {t("editor.signups.download")}
          </CSVLink>
        </div>
      </nav>
      {/* eslint-disable-next-line no-nested-ternary */}
      {!signups?.length ? (
        <p>{t("editor.signups.noSignups")}</p>
      ) : grouped ? (
        signupsByQuota?.map((quota) => (
          <Fragment key={quota.id ?? quota.type}>
            <h3>{quota.type === SignupStatus.IN_QUEUE ? t("editor.signups.inQueue") : quota.title}</h3>
            <SignupTable event={event} signups={quota.signups} showQuota={false} />
          </Fragment>
        ))
      ) : (
        <SignupTable event={event} signups={signups} showQuota={!isSingleQuota} />
      )}
    </div>
  );
};

export default SignupsTab;
