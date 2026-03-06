import type { EventID, EventSlug, SignupEditToken, SignupID } from "@tietokilta/ilmomasiina-models";

export const urlPrefix = PATH_PREFIX;

const paths = {
  hasAdmin: true,

  eventsList: `${urlPrefix}/`,
  eventDetails: (slug: EventSlug) => `${urlPrefix}/events/${slug}`,
  editSignup: (id: SignupID, editToken: SignupEditToken) => `${urlPrefix}/signup/${id}/${editToken}`,
  completePayment: (id: SignupID, editToken: SignupEditToken) => `${urlPrefix}/payment/${id}/${editToken}`,

  adminLogin: `${urlPrefix}/login`,
  adminInitialSetup: `${urlPrefix}/setup`,
  adminEventsList: `${urlPrefix}/admin`,
  adminEditEvent: (id: EventID) => `${urlPrefix}/admin/edit/${id}`,
  adminCopyEvent: (id: EventID) => `${urlPrefix}/admin/copy/${id}`,
  adminUsersList: `${urlPrefix}/admin/users`,
  adminAuditLog: `${urlPrefix}/admin/auditlog`,
};

export default paths;

export const apiUrl = API_URL || `${urlPrefix}/api`;
