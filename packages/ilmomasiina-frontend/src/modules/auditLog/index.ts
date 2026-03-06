import { ApiError } from "@tietokilta/ilmomasiina-client";
import { AuditLogResponse, AuditLoqQuery } from "@tietokilta/ilmomasiina-models";
import storeSlice from "../../utils/storeSlice";
import type { Root } from "../store";

export interface AuditLogState {
  query: AuditLoqQuery;
  auditLog: AuditLogResponse | null;
  loadError?: ApiError;
}

const initialState: AuditLogState = {
  query: {},
  auditLog: null,
};

export type AuditLogSlice = AuditLogState & {
  resetState: () => void;
  getAuditLogs: (query?: AuditLoqQuery) => Promise<void>;
  setAuditLogQueryField: <K extends keyof AuditLoqQuery>(key: K, value: AuditLoqQuery[K]) => Promise<void>;
};

export const auditLogSlice = storeSlice<Root>()("auditLog", (set, get, store, getSlice, setSlice, resetState) => ({
  ...initialState,
  resetState,

  getAuditLogs: async (query: AuditLoqQuery = {} as AuditLoqQuery) => {
    setSlice({
      query,
      auditLog: null,
      loadError: undefined,
    });

    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(query)
          .filter(([, value]) => value)
          .map(([key, value]) => [key, String(value)]),
      ),
    );

    try {
      const response = await get().auth.adminApiFetch<AuditLogResponse>(`admin/auditlog?${queryString}`);
      setSlice({
        auditLog: response,
        loadError: undefined,
      });
    } catch (e) {
      setSlice({
        auditLog: null,
        loadError: e as ApiError,
      });
    }
  },

  setAuditLogQueryField: async <K extends keyof AuditLoqQuery>(key: K, value: AuditLoqQuery[K]) => {
    const newQuery = {
      ...getSlice().query,
      [key]: value,
    };
    // reset pagination when touching non-pagination fields
    if (key !== "offset" && key !== "limit") {
      delete newQuery.offset;
    }
    await getSlice().getAuditLogs(newQuery);
  },
}));
