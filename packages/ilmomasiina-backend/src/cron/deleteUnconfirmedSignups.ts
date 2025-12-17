import debug from "debug";
import _ from "lodash";
import moment from "moment";
import { Op } from "sequelize";

import config from "../config";
import { Event } from "../models/event";
import { Quota } from "../models/quota";
import { Signup } from "../models/signup";
import { refreshSignupPositions } from "../routes/signups/computeSignupPosition";

const debugLog = debug("app:cron:unconfirmed");

export default async function deleteUnconfirmedSignups() {
  const signups = await Signup.findAll({
    where: {
      [Op.and]: {
        // Is not confirmed, and is too old
        confirmedAt: {
          [Op.eq]: null,
        },
        createdAt: {
          [Op.lt]: moment().subtract(config.signupConfirmMins, "minutes").toDate(),
        },
      },
    },
    include: [
      {
        model: Quota,
        attributes: ["id"],
        include: [
          {
            model: Event,
            attributes: ["id", "openQuotaSize"],
          },
        ],
      },
    ],
    // Also already-deleted signups
    paranoid: false,
  });

  if (signups.length === 0) {
    debugLog("No unconfirmed signups to delete");
    return;
  }

  const signupIds = signups.map((signup) => signup.id);
  const uniqueEvents = _.uniqBy(
    signups.map((signup) => signup.quota!.event!),
    "id",
  );

  console.info(`Deleting unconfirmed signups: ${signupIds.join(", ")}`);
  try {
    await Signup.destroy({
      where: { id: signupIds },
      // skip deletion grace period
      force: true,
    });
    for (const event of uniqueEvents) {
      // Avoid doing many simultaneous transactions with this loop.
      // eslint-disable-next-line no-await-in-loop
      await refreshSignupPositions(event);
    }
    debugLog("Unconfirmed signups deleted");
  } catch (error) {
    console.error(error);
  }
}
