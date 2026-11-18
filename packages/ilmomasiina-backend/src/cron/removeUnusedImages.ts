import moment from "moment";
import { Op, WhereOptions } from "sequelize";

import { Event } from "../models/event";
import { Image } from "../models/image";

/** Uploads are given this long to be attached to an event before they count as unused. */
const GRACE_PERIOD_HOURS = 24;

/** Deletes uploaded images that no event refers to, so abandoned uploads don't pile up in the database. */
export default async function removeUnusedImages() {
  const candidates = await Image.findAll({
    attributes: ["id"],
    where: { createdAt: { [Op.lt]: moment().subtract(GRACE_PERIOD_HOURS, "hours").toDate() } } as WhereOptions,
  });

  // Unscoped, so drafts and unlisted events count as users of an image too.
  // eslint-disable-next-line no-restricted-syntax
  for (const { id } of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const used = await Event.unscoped().count({ where: { imageUrl: { [Op.like]: `%/api/images/${id}` } } });
    if (used === 0) {
      // eslint-disable-next-line no-await-in-loop
      await Image.destroy({ where: { id } });
    }
  }
}
