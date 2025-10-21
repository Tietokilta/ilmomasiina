import React from "react";

import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { EditSignupProps, EditSignupProvider, useEditSignupContext } from "@tietokilta/ilmomasiina-client";
import { PaymentStatus, PaymentSuccessResponse } from "@tietokilta/ilmomasiina-models";

// import { useTranslation } from "react-i18next";

const CheckPayment = () => {
  // const { t } = useTranslation();
  const [data, setData] = React.useState<PaymentSuccessResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const { localizedEvent: event, signup } = useEditSignupContext();
  const { id, editToken } = useParams<EditSignupProps>();
  const {
    i18n: { language },
  } = useTranslation();

  // TODO: PaymentProvider

  React.useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      if (!id || !editToken) {
        setError("Missing signupId or editToken in URL path");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/payments/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Edit-Token": editToken,
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = (await res.json()) as PaymentSuccessResponse | null;
        if (cancelled) return;

        if (!json) {
          throw new Error("Empty response");
        }

        setData(json);

        const status = json.paymentStatus;

        if (status === PaymentStatus.PAID) {
          localStorage.setItem("paymentStatus", "paid");
        } else if (status === PaymentStatus.PENDING) {
          localStorage.setItem("paymentStatus", "pending");
        } else if (status === PaymentStatus.UNPAID) {
          localStorage.setItem("paymentStatus", "unpaid");
        } else if (status === PaymentStatus.DISABLED) {
          localStorage.setItem("paymentStatus", "disabled");
        } else if (status === PaymentStatus.CANCELED) {
          localStorage.setItem("paymentStatus", "canceled");
        } else {
          localStorage.setItem("paymentStatus", "error");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
          const base = `/payment/${id}/${editToken}`;
          window.location.replace(`${base}?payment=error`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [id, editToken]);

  return (
    <EditSignupProvider id={id} editToken={editToken} language={language}>
      <div>
        <h1>Check Payment for {event && event.title}</h1>
        <p>Please wait while we verify your payment status…</p>

        <div>
          <p>
            <span>Signup ID:</span> {id || "(missing)"}
          </p>
          <p>
            <span>Edit Token:</span> {editToken}
          </p>
          <p>
            <span>Price:</span> {signup?.quota?.price ?? "none"}
          </p>
        </div>

        {loading && <p>Loading…</p>}
        {error && (
          <p role="alert">
            {error}
          </p>
        )}
        {data && (
          <ul>
            <li>success: {(data as any).success?.toString?.() ?? "n/a"}</li>
            <li>paymentID: {(data as any).paymentID ?? "n/a"}</li>
            <li>signupID: {(data as any).signupID ?? "n/a"}</li>
            <li>amount: {(data as any).amount ?? "n/a"}</li>
            <li>paymentStatus: {String(data.paymentStatus ?? "n/a")}</li>
          </ul>
        )}
      </div>
    </EditSignupProvider>
  );
};

export default CheckPayment;
