import { EventID, EventSlug, SignupEditToken, SignupID } from "@tietokilta/ilmomasiina-models";

export const urlPrefix = PATH_PREFIX;

const paths = {
  hasAdmin: true,

  eventsList: `${urlPrefix}/`,
  eventDetails: (slug: EventSlug) => `${urlPrefix}/events/${slug}`,
  editSignup: (id: SignupID, editToken: SignupEditToken) => `${urlPrefix}/signup/${id}/${editToken}`,
  checkPayment: (id: SignupID, editToken: SignupEditToken) => `${urlPrefix}/payment/${id}/${editToken}`,
  successPayment: (id: SignupID, editToken: SignupEditToken) => `${urlPrefix}/payment/success/${id}/${editToken}`,

  adminLogin: `${urlPrefix}/login`,
  adminInitialSetup: `${urlPrefix}/setup`,
  adminEventsList: `${urlPrefix}/admin`,
  adminEditEvent: (id: EventID) => `${urlPrefix}/admin/edit/${id}`,
  adminUsersList: `${urlPrefix}/admin/users`,
  adminAuditLog: `${urlPrefix}/admin/auditlog`,
};

export default paths;

export const apiUrl = `${urlPrefix}/api`;
