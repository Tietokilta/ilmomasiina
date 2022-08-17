import {
  AdminEventPathParams,
  SignupEditToken,
  SignupPathParams,
  UserEventPathParams,
} from '@tietokilta/ilmomasiina-models/src/schema';

export type UserPaths = {
  api: string;

  eventsList: string;
  eventDetails: (slug: UserEventPathParams['slug']) => string;
  editSignup: (id: SignupPathParams['id'], editToken: SignupEditToken) => string;
};

export type AdminPaths = {
  adminLogin: string;
  adminEventsList: string;
  adminEditEvent: (id: AdminEventPathParams['id']) => string,
  adminUsersList: string;
  adminAuditLog: string;
};

export type PublicPaths = { hasAdmin: false } & UserPaths;
export type FullPaths = { hasAdmin: true } & UserPaths & AdminPaths;
export type IlmoPaths = PublicPaths | FullPaths;

export const defaultPaths: IlmoPaths = {
  hasAdmin: false,
  api: '/api',

  eventsList: '/',
  eventDetails: (slug: UserEventPathParams['slug']) => `/events/${slug}`,
  editSignup: (id: SignupPathParams['id'], editToken: SignupEditToken) => `/signup/${id}/${editToken}`,
};

let configuredPaths: IlmoPaths = defaultPaths;

export function paths(): IlmoPaths {
  return configuredPaths;
}

export function fullPaths(): FullPaths {
  if (!configuredPaths.hasAdmin) {
    throw new Error('This app is not configured with admin paths.');
  }
  return configuredPaths;
}

export function configurePaths(newPaths: IlmoPaths) {
  configuredPaths = newPaths;
}
