import {
  and, eq, gt, isNotNull, or,
} from 'drizzle-orm';
import moment from 'moment';

import { eventTable, signupTable } from './schema';

export const EVENT_USER_VISIBLE = and(
  eq(eventTable.draft, false),
  or(
    gt(eventTable.registrationEndDate, moment().subtract(7, 'days').toDate()),
    gt(eventTable.date, moment().subtract(7, 'days').toDate()),
    gt(eventTable.endDate, moment().subtract(7, 'days').toDate()),
  ),
);
export const SIGNUP_IS_ACTIVE = or(isNotNull(signupTable.confirmedAt), gt(signupTable.createdAt, moment().subtract(30, 'minutes').toDate()));
