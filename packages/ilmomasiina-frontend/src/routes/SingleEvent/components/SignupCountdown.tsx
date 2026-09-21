import React from "react";

import Countdown from "react-countdown";

import { useSingleEventContext } from "@tietokilta/ilmomasiina-client";
import SignupButton from "./SignupButton";

const SignupCountdown = () => {
  const { registrationOpens, localizedEvent: event } = useSingleEventContext();

  return (
    <Countdown
      daysInHours
      date={registrationOpens}
      renderer={({ completed, seconds, total }) => (
        <SignupButton
          isOpen={completed && !event!.registrationClosed}
          isClosed={event!.registrationClosed}
          seconds={seconds}
          total={total}
        />
      )}
    />
  );
};

export default SignupCountdown;
