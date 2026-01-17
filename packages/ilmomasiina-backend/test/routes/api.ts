import { FastifyInstance } from "fastify/types/instance";

import {
  AdminEventListResponse,
  AdminEventResponse,
  AdminSignupSchema,
  AdminSignupUpdateBody,
  EDIT_TOKEN_HEADER,
  EventCreateBody,
  EventListQuery,
  EventUpdateBody,
  SignupForEditResponse,
  SignupUpdateBody,
  UserEventListResponse,
  UserEventResponse,
} from "@tietokilta/ilmomasiina-models";
import { Event } from "../../src/models/event";
import { generateToken } from "../../src/routes/signups/editTokens";

/** Handles server errors from injected requests. */
export function handleTestResponse<R>(response: Awaited<ReturnType<FastifyInstance["inject"]>>, ignore500 = false) {
  if (response.statusCode >= 500 && !ignore500) {
    throw new Error(`Request failed with status ${response.statusCode}: ${response.payload}`);
  }
  if (response.statusCode === 204) {
    return [null, response] as [R, typeof response];
  }
  return [response.json<R>(), response] as const;
}

function editTokenHeaders(signupId: string, editToken?: string | false) {
  if (editToken === false) return {};
  return { [EDIT_TOKEN_HEADER]: editToken ?? generateToken(signupId) };
}

export async function fetchUserEventList(query?: EventListQuery) {
  const response = await server.inject({
    method: "GET",
    url: "/api/events",
    query: query as Record<string, string>,
  });
  return handleTestResponse<UserEventListResponse>(response);
}

export async function fetchUserEventDetails(event: Event) {
  const response = await server.inject({
    method: "GET",
    url: `/api/events/${event.slug}`,
  });
  return handleTestResponse<UserEventResponse>(response);
}

export async function fetchSignupForEdit(signupId: string, editToken?: string | false) {
  const response = await server.inject({
    method: "GET",
    url: `/api/signups/${signupId}`,
    headers: editTokenHeaders(signupId, editToken),
  });
  return handleTestResponse<SignupForEditResponse>(response);
}

export async function updateSignupAsUser(signupId: string, body: SignupUpdateBody, editToken?: string | false) {
  const response = await server.inject({
    method: "PATCH",
    url: `/api/signups/${signupId}`,
    headers: editTokenHeaders(signupId, editToken),
    payload: body,
  });
  return handleTestResponse<{ id: string }>(response);
}

export async function deleteSignupAsUser(signupId: string, editToken?: string | false) {
  const response = await server.inject({
    method: "DELETE",
    url: `/api/signups/${signupId}`,
    headers: editTokenHeaders(signupId, editToken),
  });
  return handleTestResponse<null>(response);
}

export async function startPayment(signupId: string, editToken?: string | false, ignore500 = false) {
  const response = await server.inject({
    method: "POST",
    url: `/api/signups/${signupId}/payment/start`,
    headers: editTokenHeaders(signupId, editToken),
  });
  return handleTestResponse<{ paymentUrl: string }>(response, ignore500);
}

export async function completePayment(signupId: string, editToken?: string | false, ignore500 = false) {
  const response = await server.inject({
    method: "POST",
    url: `/api/signups/${signupId}/payment/complete`,
    headers: editTokenHeaders(signupId, editToken),
  });
  return handleTestResponse<SignupForEditResponse>(response, ignore500);
}

export async function fetchAdminEventList() {
  const response = await server.inject({
    method: "GET",
    url: "/api/admin/events",
    headers: { authorization: adminToken },
  });
  return handleTestResponse<AdminEventListResponse>(response);
}

export async function fetchAdminEventDetails(event: Pick<Event, "id">) {
  const response = await server.inject({
    method: "GET",
    url: `/api/admin/events/${event.id}`,
    headers: { authorization: adminToken },
  });
  return handleTestResponse<AdminEventResponse>(response);
}

export async function createEvent(body: EventCreateBody) {
  const response = await server.inject({
    method: "POST",
    url: "/api/admin/events",
    body,
    headers: { authorization: adminToken },
  });
  return handleTestResponse<AdminEventResponse>(response);
}

export async function updateEvent(event: Pick<Event, "id">, body: EventUpdateBody) {
  const response = await server.inject({
    method: "PATCH",
    url: `/api/admin/events/${event.id}`,
    body,
    headers: { authorization: adminToken },
  });
  return handleTestResponse<AdminEventResponse>(response);
}

export async function deleteEvent(event: Pick<Event, "id">) {
  const response = await server.inject({
    method: "DELETE",
    url: `/api/admin/events/${event.id}`,
    headers: { authorization: adminToken },
  });
  return [null, response] as const;
}

export async function updateSignupAsAdmin(signupId: string, body: AdminSignupUpdateBody) {
  const response = await server.inject({
    method: "PATCH",
    url: `/api/admin/signups/${signupId}`,
    headers: { authorization: adminToken },
    payload: body,
  });
  return handleTestResponse<AdminSignupSchema>(response);
}

export async function deleteSignupAsAdmin(signupId: string) {
  const response = await server.inject({
    method: "DELETE",
    url: `/api/admin/signups/${signupId}`,
    headers: { authorization: adminToken },
  });
  return handleTestResponse<null>(response);
}

export function stripeWebhook(body: string, signature: string | undefined) {
  return server.inject({
    method: "POST",
    url: `/api/stripe/webhook`,
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature,
    },
    payload: Buffer.from(body),
  });
}
