import React from "react";

import { Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { PaymentProps, PaymentProvider, usePaymentContext }
  from "@tietokilta/ilmomasiina-client";
import NarrowContainer from "../EditSignup/components/NarrowContainer";

const PaymentForm = () => {
  const { localizedEvent: event, signup, payment } = usePaymentContext();
  return (
    <div>
      <p>{event?.title}</p>
      <p>{`${signup?.id}->${signup?.price}`}</p>
      <ul>
        <li>{payment?.id}</li>
        <li>{(payment?.amount_total ?? 0) / 100}€</li>
        <li>{payment?.currency}</li>
        <li>{payment?.payment_status}</li>
        <li>
          <button
            type="button"
            onClick={
            () => payment?.url ? window.location.assign(payment?.url) : console.log(payment)
          }>Pay up</button>
        </li>
      </ul>
    </div>
  )
}

// import { useTranslation } from "react-i18next";
const PaymentView = () => {
  const { error, pending } = usePaymentContext();

  if (error) {
    return (
      <NarrowContainer className="ilmo--status-container">
        <h1>Error</h1>
        <p>error</p>
      </NarrowContainer>
    );
  }

  if (pending) {
    return (
      <div className="ilmo--loading-container">
        <Spinner animation="border" />
      </div>
    );
  }

  return <PaymentForm />;
}


const CheckPayment = () => {
  // const { t } = useTranslation();
  const { id, editToken } = useParams<PaymentProps>();
  const {
    i18n: { language },
  } = useTranslation();

  return (
    <PaymentProvider id={id} editToken={editToken} language={language}>
      <PaymentView />
    </PaymentProvider>
  );
};

export default CheckPayment;
