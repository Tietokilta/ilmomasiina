import apiFetch from '@tietokilta/ilmomasiina-components/src/api';
import { UserID, UserInviteSchema, UserListSchema } from '@tietokilta/ilmomasiina-models/src/schema';
import { DispatchAction } from '../../store/types';
import { loginExpired } from '../auth/actions';
import {
  RESET,
  USER_CREATE_FAILED,
  USER_CREATED,
  USER_CREATING,
  USERS_LOAD_FAILED,
  USERS_LOADED,
} from './actionTypes';

export const resetState = () => <const>{
  type: RESET,
};

export const usersLoaded = (users: UserListSchema) => <const>{
  type: USERS_LOADED,
  payload: users,
};

export const usersLoadFailed = () => <const>{
  type: USERS_LOAD_FAILED,
};

export const userCreating = () => <const>{
  type: USER_CREATING,
};

export const userCreateFailed = () => <const>{
  type: USER_CREATE_FAILED,
};

export const userCreated = () => <const>{
  type: USER_CREATED,
};

export type AdminUsersActions =
  | ReturnType<typeof usersLoaded>
  | ReturnType<typeof usersLoadFailed>
  | ReturnType<typeof userCreateFailed>
  | ReturnType<typeof userCreating>
  | ReturnType<typeof userCreated>
  | ReturnType<typeof resetState>;

export const getUsers = () => async (dispatch: DispatchAction) => {
  try {
    const response = await apiFetch('admin/users', {}, () => dispatch(loginExpired()));
    dispatch(usersLoaded(response as UserListSchema));
  } catch (e) {
    dispatch(usersLoadFailed());
  }
};

export const createUser = (data: UserInviteSchema) => async (dispatch: DispatchAction) => {
  dispatch(userCreating());

  try {
    await apiFetch('admin/users', {
      method: 'POST',
      body: data,
    }, () => dispatch(loginExpired()));
    dispatch(userCreated());
    return true;
  } catch (e) {
    dispatch(userCreateFailed());
    return false;
  }
};

export const deleteUser = (id: UserID) => async (dispatch: DispatchAction) => {
  try {
    await apiFetch(`admin/users/${id}`, {
      method: 'DELETE',
    }, () => dispatch(loginExpired()));
    return true;
  } catch (e) {
    return false;
  }
};
