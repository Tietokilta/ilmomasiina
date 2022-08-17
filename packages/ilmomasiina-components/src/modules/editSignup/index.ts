import { UserSignupForEditSchema } from '@tietokilta/ilmomasiina-models/src/schema';
import apiFetch from '../../api';
import { MatchParams } from '../../routes/EditSignup';
import { useAbortablePromise } from '../../utils/abortable';
import useShallowMemo from '../../utils/useShallowMemo';
import { ExternalState } from './reducer';

export { Provider, useStateAndDispatch } from './reducer';

export function useEditSignupState({ id, editToken }: MatchParams) {
  const fetchSignup = useAbortablePromise(async (signal) => {
    const response = await apiFetch(`signups/${id}?editToken=${editToken}`, { signal }) as UserSignupForEditSchema;
    return {
      ...response,
      signup: {
        ...response.signup,
        firstName: response.signup.firstName || '',
        lastName: response.signup.lastName || '',
        email: response.signup.email || '',
      },
    };
  }, [id, editToken]);

  return useShallowMemo<ExternalState>({
    editToken,
    pending: fetchSignup.pending,
    error: fetchSignup.error,
    ...fetchSignup.result,
  });
}
