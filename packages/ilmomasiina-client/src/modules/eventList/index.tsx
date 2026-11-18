import React, { PropsWithChildren, useMemo } from "react";

import type { UserEventListResponse } from "@tietokilta/ilmomasiina-models";
import { ApiError, apiFetch } from "../../api";
import { useAbortablePromise } from "../../utils/abortable";
import { getLocalizedEventListItem } from "../../utils/localizedEvent";
import { createStateContext } from "../../utils/stateContext";
import useShallowMemo from "../../utils/useShallowMemo";

export type EventListProps = {
  category?: string;
  language?: string;
  /** If set, includes events at most this many days old. Defaults to the server's default. */
  maxAge?: number;
};

type State = {
  events?: UserEventListResponse;
  localizedEvents?: UserEventListResponse;
  pending: boolean;
  error?: ApiError;
};

const { Provider, useStateContext } = createStateContext<State>();
export { useStateContext as useEventListContext };

export function useEventListState({ category, language, maxAge }: EventListProps = {}) {
  const {
    result: events,
    error,
    pending,
  } = useAbortablePromise(
    (signal) => {
      const params = new URLSearchParams();
      if (category !== undefined) params.set("category", category);
      if (maxAge !== undefined) params.set("maxAge", String(maxAge));
      const query = params.size > 0 ? `?${params}` : "";
      return apiFetch<UserEventListResponse>(`events${query}`, {
        signal,
      });
    },
    [category, maxAge],
  );

  const localizedEvents = useMemo(
    () => (events && language ? events.map((event) => getLocalizedEventListItem(event, language)) : events),
    [events, language],
  );

  return useShallowMemo<State>({
    events,
    localizedEvents,
    pending,
    error: error as ApiError | undefined,
  });
}

export function EventListProvider({ category, language, maxAge, children }: PropsWithChildren<EventListProps>) {
  const state = useEventListState({ category, language, maxAge });
  return <Provider value={state}>{children}</Provider>;
}
