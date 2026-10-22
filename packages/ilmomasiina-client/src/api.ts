import type { ErrorCode, ErrorResponse } from "@tietokilta/ilmomasiina-models";

export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  status: number;
  code?: ErrorCode;
  response?: unknown;

  constructor(status: number, response: Pick<ErrorResponse, "message" | "code">) {
    super(response.message);
    this.status = status;
    this.name = "ApiError";
    this.code = response.code;
    this.response = response;
  }

  static async fromResponse(response: Response) {
    try {
      const data = (await response.json()) as ErrorResponse;
      if (data.message) {
        return new ApiError(response.status, data);
      }
    } catch {
      /* fall through */
    }
    return new ApiError(response.status, { message: response.statusText });
  }
}

let apiUrl = "/api";

export function configureApi(url: string) {
  apiUrl = url;
}

export async function apiFetch<T = unknown>(uri: string, { method = "GET", body, headers, signal }: FetchOptions = {}) {
  const allHeaders = {
    ...(headers || {}),
  };
  if (body !== undefined) {
    allHeaders["Content-Type"] = "application/json; charset=utf-8";
  }

  const response = await fetch(`${apiUrl}/${uri}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: allHeaders,
    signal,
  }).catch((err: unknown) => {
    // convert network errors to barebones ApiError
    throw new ApiError(0, err as Error);
  });
  // proper API errors, try to parse JSON
  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }
  // 204 No Content
  if (response.status === 204) {
    return null as T;
  }
  // just in case, convert JSON parse errors for 2xx responses to ApiError
  return response.json().catch((err: unknown) => {
    throw new ApiError(0, err as Error);
  }) as Promise<T>;
}
