import { ApiError } from "@tietokilta/ilmomasiina-client";
import type { AdminEventListResponse, EventID } from "@tietokilta/ilmomasiina-models";
import storeSlice from "../../utils/storeSlice";
import type { Root } from "../store";

export interface AdminEventsState {
  events: AdminEventListResponse | null;
  loadError?: ApiError;
}

const initialState: AdminEventsState = {
  events: null,
};

export type AdminEventsSlice = AdminEventsState & {
  resetState: () => void;
  getAdminEvents: () => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
};

export const adminEventsSlice = storeSlice<Root>()(
  "adminEvents",
  (set, get, store, getSlice, setSlice, resetState) => ({
    ...initialState,
    resetState,

    getAdminEvents: async () => {
      try {
        const response = await get().auth.adminApiFetch<AdminEventListResponse>("admin/events");
        setSlice({ events: response, loadError: undefined });
      } catch (e) {
        setSlice({ events: null, loadError: e as ApiError });
      }
    },

    deleteEvent: async (id: EventID) => {
      await get().auth.adminApiFetch(`admin/events/${id}`, { method: "DELETE" });
    },
  }),
);
