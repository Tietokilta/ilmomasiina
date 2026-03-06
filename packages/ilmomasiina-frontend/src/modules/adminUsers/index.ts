import { ApiError } from "@tietokilta/ilmomasiina-client";
import type {
  UserChangePasswordSchema,
  UserID,
  UserInviteSchema,
  UserListResponse,
} from "@tietokilta/ilmomasiina-models";
import storeSlice from "../../utils/storeSlice";
import type { Root } from "../store";

export interface AdminUsersState {
  users: UserListResponse | null;
  loadError?: ApiError;
}

const initialState: AdminUsersState = {
  users: null,
};

export type AdminUsersSlice = AdminUsersState & {
  resetState: () => void;
  getUsers: () => Promise<void>;
  createUser: (data: UserInviteSchema) => Promise<void>;
  deleteUser: (id: UserID) => Promise<void>;
  resetUserPassword: (id: UserID) => Promise<void>;
  changePassword: (data: UserChangePasswordSchema) => Promise<void>;
};

export const adminUsersSlice = storeSlice<Root>()("adminUsers", (set, get, store, getSlice, setSlice, resetState) => ({
  ...initialState,
  resetState,

  getUsers: async () => {
    try {
      const response = await get().auth.adminApiFetch<UserListResponse>("admin/users");
      setSlice({ users: response, loadError: undefined });
    } catch (e) {
      setSlice({ users: null, loadError: e as ApiError });
    }
  },

  createUser: async (data: UserInviteSchema) => {
    await get().auth.adminApiFetch("admin/users", { method: "POST", body: data });
  },
  deleteUser: async (id: UserID) => {
    await get().auth.adminApiFetch(`admin/users/${id}`, { method: "DELETE" });
  },

  resetUserPassword: async (id: UserID) => {
    await get().auth.adminApiFetch(`admin/users/${id}/resetpassword`, { method: "POST" });
  },
  changePassword: async (data: UserChangePasswordSchema) => {
    await get().auth.adminApiFetch("admin/users/self/changepassword", { method: "POST", body: data });
  },
}));
