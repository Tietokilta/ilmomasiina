import React, { PropsWithChildren, useMemo } from "react";

import type { UserEventResponse } from "@tietokilta/ilmomasiina-models";
import { ApiError, apiFetch } from "../../api";
import { useAbortablePromise } from "../../utils/abortable";
import { getLocalizedEvent } from "../../utils/localizedEvent";
import { getSignupsByQuota, QuotaSignups } from "../../utils/signupUtils";
import { createStateContext } from "../../utils/stateContext";
import useShallowMemo from "../../utils/useShallowMemo";

export interface SingleEventProps {
  slug: string;
  language?: string;
}

type State = {
  event?: UserEventResponse;
  localizedEvent?: UserEventResponse;
  signupsByQuota?: QuotaSignups[];
  registrationOpens?: number;
  pending: boolean;
  error?: ApiError;
  preview?: { setPreviewingForm: (form: boolean) => void };
};

const { Provider, useStateContext } = createStateContext<State>();
export { useStateContext as useSingleEventContext };
export { beginSignup } from "./actions";
export type { State as SingleEventState };
export { Provider as SingleEventContextProvider };

export function useSingleEventState({ slug, language }: SingleEventProps) {
  const { result, error, pending } = useAbortablePromise(
    async (signal) => {
      const event = await apiFetch<UserEventResponse>(`events/${slug}`, { signal });
      return {
        event,
        // Compute registrationOpens as early as possible to make it as accurate as possible.
        registrationOpens: Date.now() + (event.millisTillOpening || 0),
      };
    },
    [slug],
  );
  const { event, registrationOpens } = result ?? {};

  const localizedEvent = useMemo(
    () => (event && language ? getLocalizedEvent(event, language) : event),
    [event, language],
  );

  const signupsByQuota = useMemo(() => localizedEvent && getSignupsByQuota(localizedEvent), [localizedEvent]);

  return useShallowMemo<State>({
    event,
    localizedEvent,
    signupsByQuota,
    registrationOpens,
    pending,
    error: error as ApiError | undefined,
  });
}

export function SingleEventProvider({ slug, language, children }: PropsWithChildren<SingleEventProps>) {
  const state = useSingleEventState({ slug, language });
  return <Provider value={state}>{children}</Provider>;
}
