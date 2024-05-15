import debug from 'debug';
import {
  and, eq, inArray, isNull, lt,
} from 'drizzle-orm';
import _ from 'lodash';
import moment from 'moment';

import { db } from '../drizzle/db';
import { eventTable, quotaTable, signupTable } from '../drizzle/schema';
import { refreshSignupPositions } from '../routes/signups/computeSignupPosition';

const debugLog = debug('app:cron:unconfirmed');

export default async function deleteUnconfirmedSignups() {
  const thirtyMinutesAgo = moment().subtract(30, 'minutes').toDate();

  const results = await db.select({
    signup: {
      id: signupTable.id,
    },
    quota: {
      id: quotaTable.id,
    },
    event: {
      id: eventTable.id,
      title: eventTable.title,
      openQuotaSize: eventTable.openQuotaSize,
      date: eventTable.date,
      location: eventTable.location,
    },
  })
    .from(signupTable)
    .leftJoin(quotaTable, eq(signupTable.quotaId, quotaTable.id))
    .leftJoin(eventTable, eq(quotaTable.eventId, eventTable.id))
    .where(and(
      isNull(signupTable.confirmedAt),
      lt(signupTable.createdAt, thirtyMinutesAgo),
    ))
    .execute();

  if (results.length === 0) {
    debugLog('No unconfirmed signups to delete');
    return;
  }

  const signupIds = results.map((res) => res.signup.id);
  const uniqueEvents = _.compact(_.uniqBy(results.map((res) => res.event), 'id'));

  console.info(`Deleting unconfirmed signups: ${signupIds.join(', ')}`);
  try {
    await db.delete(signupTable)
      .where(inArray(signupTable.id, signupIds))
      .execute();
    for (const event of uniqueEvents) {
      // Avoid doing many simultaneous transactions with this loop.
      // eslint-disable-next-line no-await-in-loop
      await refreshSignupPositions(event);
    }
    debugLog('Unconfirmed signups deleted');
  } catch (error) {
    console.error(error);
  }
}
