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
};

type State = {
  events?: UserEventListResponse;
  localizedEvents?: UserEventListResponse;
  pending: boolean;
  error?: ApiError;
};

const { Provider, useStateContext } = createStateContext<State>();
export { useStateContext as useEventListContext };

export function useEventListState({ category, language }: EventListProps = {}) {
  const {
    result: events,
    error,
    pending,
  } = useAbortablePromise(
    (signal) => {
      const query = category === undefined ? "" : `?${new URLSearchParams({ category })}`;
      return apiFetch<UserEventListResponse>(`events${query}`, {
        signal,
      });
    },
    [category],
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

export function EventListProvider({ category, language, children }: PropsWithChildren<EventListProps>) {
  const state = useEventListState({ category, language });
  return <Provider value={state}>{children}</Provider>;
}
