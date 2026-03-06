import React from "react";

import Countdown from "react-countdown";

import { useSingleEventContext } from "@tietokilta/ilmomasiina-client";
import SignupButton from "./SignupButton";

const SignupCountdown = () => {
  const event = useSingleEventContext().localizedEvent!;
  const openingTime = new Date(Date.now() + (event.millisTillOpening || 0));

  return (
    <Countdown
      daysInHours
      date={openingTime}
      renderer={({ completed, seconds, total }) => (
        <SignupButton
          isOpen={completed && !event.registrationClosed}
          isClosed={event.registrationClosed}
          seconds={seconds}
          total={total}
        />
      )}
    />
  );
};

export default SignupCountdown;
