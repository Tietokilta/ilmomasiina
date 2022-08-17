import {
  AdminEventPathParams,
  SignupEditToken,
  SignupPathParams,
  UserEventPathParams,
} from '@tietokilta/ilmomasiina-models/src/schema';

export const urlPrefix = PREFIX_URL;

const appPaths = {
  hasAdmin: true,
  api: API_URL || `${urlPrefix}/api`,

  eventsList: `${urlPrefix}/`,
  eventDetails: (slug: UserEventPathParams['slug']) => `${urlPrefix}/events/${slug}`,
  editSignup: (id: SignupPathParams['id'], editToken: SignupEditToken) => `${urlPrefix}/signup/${id}/${editToken}`,

  adminLogin: `${urlPrefix}/login`,
  adminEventsList: `${urlPrefix}/admin`,
  adminEditEvent: (id: AdminEventPathParams['id']) => `${urlPrefix}/admin/edit/${id}`,
  adminUsersList: `${urlPrefix}/admin/users`,
  adminAuditLog: `${urlPrefix}/admin/auditlog`,
};

export default appPaths;
