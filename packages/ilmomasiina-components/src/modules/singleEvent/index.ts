import { useMemo } from 'react';

import { UserEventSchema } from '@tietokilta/ilmomasiina-models/src/schema';
import apiFetch from '../../api';
import { useAbortablePromise } from '../../utils/abortable';
import { getSignupsByQuota, QuotaSignups } from '../../utils/signupUtils';
import { createStateContext } from '../../utils/stateContext';
import useShallowMemo from '../../utils/useShallowMemo';

export interface SingleEventProps {
  slug: string;
}

type State = {
  event?: UserEventSchema;
  signupsByQuota?: QuotaSignups[];
  pending: boolean;
  error: boolean;
};

const { Provider, useStateContext } = createStateContext<State>();
export { Provider as SingleEventProvider, useStateContext as useSingleEventContext };

export function useSingleEventState({ slug }: SingleEventProps) {
  const fetchEvent = useAbortablePromise(async (signal) => (
    await apiFetch(`events/${slug}`, { signal }) as UserEventSchema
  ), [slug]);

  const event = fetchEvent.result;

  const signupsByQuota = useMemo(() => event && getSignupsByQuota(event), [event]);

  return useShallowMemo<State>({
    event,
    signupsByQuota,
    pending: fetchEvent.pending,
    error: fetchEvent.error,
  });
}
