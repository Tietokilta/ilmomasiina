import moment from "moment";
import { Op, WhereOptions } from "sequelize";

import config from "../config";
import { Answer } from "../models/answer";
import { Event } from "../models/event";
import { Question } from "../models/question";
import { Quota } from "../models/quota";
import { Signup } from "../models/signup";

export default async function removeDeletedData() {
  const ifRemovedBefore = moment().subtract(config.deletionGracePeriod, "days").toDate();

  await Event.unscoped().destroy({
    where: {
      deletedAt: {
        [Op.lt]: ifRemovedBefore,
      },
      // Manually adding and initializing deletedAt in _every_ model would be counter-productive,
      // so casting to avoid a type error here.
    } as WhereOptions,
    force: true,
  });

  await Question.unscoped().destroy({
    where: {
      deletedAt: {
        [Op.lt]: ifRemovedBefore,
      },
    } as WhereOptions,
    force: true,
  });

  await Quota.unscoped().destroy({
    where: {
      deletedAt: {
        [Op.lt]: ifRemovedBefore,
      },
    } as WhereOptions,
    force: true,
  });

  // TODO: This will fail for signups that have payments.
  await Signup.unscoped().destroy({
    where: {
      deletedAt: {
        [Op.lt]: ifRemovedBefore,
      },
    },
  });

  // Deletes answers that have been replaced by new ones.
  // Answers to deleted signups are already CASCADEd above.
  await Answer.unscoped().destroy({
    where: {
      deletedAt: {
        [Op.lt]: ifRemovedBefore,
      },
    } as WhereOptions,
    force: true,
  });
}
