import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { SignupState, SignupStateInfo } from "@tietokilta/ilmomasiina-client/dist/utils/signupState";
import { useEventDateTimeFormatter } from "./dateFormat";

export interface SignupStateText {
  state: SignupStateInfo;
  class: string;
  shortLabel: string;
  fullLabel?: string;
}

export function useSignupStateText(state: SignupStateInfo): SignupStateText {
  const { t } = useTranslation();
  const eventDateFormat = useEventDateTimeFormatter();

  return useMemo(() => {
    switch (state.state) {
      case SignupState.disabled:
        return {
          state,
          shortLabel: t("signupState.disabled"),
          class: "ilmo--signup-disabled",
        };
      case SignupState.not_opened:
        return {
          state,
          shortLabel: t("signupState.notOpened.short", {
            date: eventDateFormat.format(new Date(state.opens)),
          }),
          fullLabel: t("signupState.notOpened", {
            date: eventDateFormat.format(new Date(state.opens)),
          }),
          class: "ilmo--signup-not-opened",
        };
      case SignupState.open:
        return {
          state,
          shortLabel: t("signupState.open.short", {
            date: eventDateFormat.format(new Date(state.closes)),
          }),
          fullLabel: t("signupState.open", {
            date: eventDateFormat.format(new Date(state.closes)),
          }),
          class: "ilmo--signup-opened",
        };
      case SignupState.closed:
        return {
          state,
          shortLabel: t("signupState.closed.short", {
            date: eventDateFormat.format(new Date(state.closed)),
          }),
          fullLabel: t("signupState.closed", {
            date: eventDateFormat.format(new Date(state.closed)),
          }),
          class: "ilmo--signup-closed",
        };
      default:
        throw new Error("invalid state");
    }
  }, [state, t, eventDateFormat]);
}
