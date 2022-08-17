import { UserEventList } from '@tietokilta/ilmomasiina-models/src/schema';
import apiFetch from '../../api';
import { useAbortablePromise } from '../../utils/abortable';
import { createStateContext } from '../../utils/stateContext';
import useShallowMemo from '../../utils/useShallowMemo';

export type EventListProps = {
  category?: string;
};

type State = {
  events?: UserEventList;
  pending: boolean;
  error: boolean;
};

const { Provider, useStateContext } = createStateContext<State>();
export { useStateContext as useEventListContext, Provider as EventListProvider };

export function useEventListState({ category }: EventListProps) {
  const fetchEvents = useAbortablePromise(async (signal) => {
    const query = category === undefined ? '' : `?${new URLSearchParams({ category })}`;
    return await apiFetch(`events${query}`, { signal }) as UserEventList;
  }, [category]);

  return useShallowMemo<State>({
    events: fetchEvents.result,
    pending: fetchEvents.pending,
    error: fetchEvents.error,
  });
}
