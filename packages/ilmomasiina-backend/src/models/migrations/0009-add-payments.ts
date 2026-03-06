import { DataTypes, Op } from "sequelize";

import { ManualPaymentStatus, PaymentStatus } from "@tietokilta/ilmomasiina-models";
import { defineMigration } from "./util";

export default defineMigration({
  name: "0009-add-payments",
  async up({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    await query.createTable(
      "payment",
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        signupId: {
          type: DataTypes.STRING,
          allowNull: false,
          references: {
            model: "signup",
            key: "id",
          },
          // Signups with payments should never be deleted.
          // Payments will never be created for unconfirmed signups, but since we use soft deletes,
          // we need to check that manually as well.
          onDelete: "RESTRICT",
          onUpdate: "RESTRICT",
        },
        stripeCheckoutSessionId: {
          type: DataTypes.STRING,
          allowNull: true,
          unique: true,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(PaymentStatus)),
          allowNull: false,
          defaultValue: PaymentStatus.CREATING,
        },
        amount: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        currency: {
          type: DataTypes.STRING(8),
          allowNull: false,
        },
        products: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        completedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      { transaction },
    );
    // Create an unique index to ensure only one active payment per signup in non-invalidated statuses.
    await query.addIndex("payment", ["signupId"], {
      name: "payment_active_key",
      unique: true,
      where: {
        status: [PaymentStatus.CREATING, PaymentStatus.PENDING, PaymentStatus.PAID],
      },
      transaction,
    });
    // Ensure stripeCheckoutSessionId is set if and only if status requires it.
    await query.addConstraint("payment", {
      type: "check",
      fields: ["status", "stripeCheckoutSessionId"],
      where: {
        [Op.or]: [
          {
            status: {
              [Op.in]: [PaymentStatus.PENDING, PaymentStatus.PAID, PaymentStatus.EXPIRED, PaymentStatus.REFUNDED],
            },
            stripeCheckoutSessionId: { [Op.ne]: null },
          },
          {
            status: {
              [Op.notIn]: [PaymentStatus.PENDING, PaymentStatus.PAID, PaymentStatus.EXPIRED, PaymentStatus.REFUNDED],
            },
            stripeCheckoutSessionId: { [Op.is]: null },
          },
        ],
      },
      transaction,
    });
    // Ensure completedAt is set if and only if status is PAID or REFUNDED.
    await query.addConstraint("payment", {
      type: "check",
      fields: ["status", "completedAt"],
      where: {
        [Op.or]: [
          {
            status: { [Op.in]: [PaymentStatus.PAID, PaymentStatus.REFUNDED] },
            completedAt: { [Op.ne]: null },
          },
          {
            status: { [Op.notIn]: [PaymentStatus.PAID, PaymentStatus.REFUNDED] },
            completedAt: { [Op.is]: null },
          },
        ],
      },
      transaction,
    });
    // Create a trigger to prevent deletions of payments.
    const q = ([name]: TemplateStringsArray) => query.quoteIdentifiers(name);
    await sequelize.query(
      `
      CREATE OR REPLACE FUNCTION ${q`payment_prevent_delete_fn`}()
        RETURNS TRIGGER AS $$
          BEGIN
            RAISE EXCEPTION 'Deletion of payments is not allowed.';
          END;
        $$ LANGUAGE plpgsql;
      `,
      { transaction },
    );
    await sequelize.query(
      `
      CREATE TRIGGER ${q`payment_prevent_delete`}
        BEFORE DELETE OR TRUNCATE ON ${q`payment`}
        FOR EACH STATEMENT
        EXECUTE FUNCTION ${q`payment_prevent_delete_fn`}();
      `,
      { transaction },
    );
    // Create a trigger to prevent updates of immutable columns.
    await sequelize.query(
      `
      CREATE OR REPLACE FUNCTION ${q`payment_immutable_fn`}()
        RETURNS TRIGGER AS $$
          BEGIN
            RAISE EXCEPTION 'These payment fields cannot be updated.';
          END;
        $$ LANGUAGE plpgsql;
      `,
      { transaction },
    );
    await sequelize.query(
      `
      CREATE TRIGGER ${q`payment_immutable`}
        BEFORE UPDATE OF
          ${q`id`},
          ${q`signupId`},
          ${q`amount`},
          ${q`currency`},
          ${q`products`},
          ${q`expiresAt`},
          ${q`createdAt`}
        ON ${q`payment`}
        FOR EACH ROW
        EXECUTE FUNCTION ${q`payment_immutable_fn`}();
      `,
      { transaction },
    );
    // Create a trigger to allow stripeCheckoutSessionId to be set once (NULL -> value).
    await sequelize.query(
      `
      CREATE OR REPLACE FUNCTION ${q`payment_session_id_set_once_fn`}()
        RETURNS TRIGGER AS $$
          BEGIN
            IF OLD.${q`stripeCheckoutSessionId`} IS NULL AND NEW.${q`stripeCheckoutSessionId`} IS NOT NULL THEN
              RETURN NEW;
            END IF;
            RAISE EXCEPTION 'stripeCheckoutSessionId can only be set once.';
          END;
        $$ LANGUAGE plpgsql;
      `,
      { transaction },
    );
    await sequelize.query(
      `
      CREATE TRIGGER ${q`payment_session_id_set_once`}
        BEFORE UPDATE OF ${q`stripeCheckoutSessionId`}
        ON ${q`payment`}
        FOR EACH ROW
        EXECUTE FUNCTION ${q`payment_session_id_set_once_fn`}();
      `,
      { transaction },
    );
    // Create a trigger to allow completedAt to be set once (NULL -> value).
    await sequelize.query(
      `
      CREATE OR REPLACE FUNCTION ${q`payment_completed_at_set_once_fn`}()
        RETURNS TRIGGER AS $$
          BEGIN
            IF OLD.${q`completedAt`} IS NULL AND NEW.${q`completedAt`} IS NOT NULL THEN
              RETURN NEW;
            END IF;
            RAISE EXCEPTION 'completedAt can only be set once.';
          END;
        $$ LANGUAGE plpgsql;
      `,
      { transaction },
    );
    await sequelize.query(
      `
      CREATE TRIGGER ${q`payment_completed_at_set_once`}
        BEFORE UPDATE OF ${q`completedAt`}
        ON ${q`payment`}
        FOR EACH ROW
        EXECUTE FUNCTION ${q`payment_completed_at_set_once_fn`}();
      `,
      { transaction },
    );
    // Create a trigger to validate state transitions of payments.
    // Valid transitions:
    //   CREATING → PENDING (Stripe accepts session)
    //   CREATING → CREATION_FAILED (Stripe rejects)
    //   PENDING → PAID (webhook or return URL confirmation)
    //   PENDING → EXPIRED (webhook or session check)
    //   PAID → REFUNDED (admin-initiated refund)
    // Terminal states: EXPIRED, CREATION_FAILED, REFUNDED
    await sequelize.query(
      `
      CREATE OR REPLACE FUNCTION ${q`payment_validate_update_fn`}()
        RETURNS TRIGGER AS $$
          BEGIN
            IF OLD.${q`status`} = NEW.${q`status`} THEN
              RETURN NEW;
            END IF;

            IF OLD.${q`status`} = 'creating' AND NEW.${q`status`} IN ('pending', 'creation_failed') THEN
              RETURN NEW;
            END IF;

            IF OLD.${q`status`} = 'pending' AND NEW.${q`status`} IN ('paid', 'expired') THEN
              RETURN NEW;
            END IF;

            IF OLD.${q`status`} = 'paid' AND NEW.${q`status`} = 'refunded' THEN
              RETURN NEW;
            END IF;

            RAISE EXCEPTION 'Invalid payment status transition from % to %', OLD.${q`status`}, NEW.${q`status`};
          END;
        $$ LANGUAGE plpgsql;
      `,
      { transaction },
    );
    await sequelize.query(
      `
      CREATE TRIGGER ${q`payment_validate_update`}
        BEFORE UPDATE ON ${q`payment`}
        FOR EACH ROW
        EXECUTE FUNCTION ${q`payment_validate_update_fn`}();
      `,
      { transaction },
    );

    // Add manual payment status column to signup for admin-managed payments without a Payment record.
    await query.addColumn(
      "signup",
      "manualPaymentStatus",
      {
        type: DataTypes.ENUM(...Object.values(ManualPaymentStatus)),
        allowNull: true,
      },
      { transaction },
    );
  },
  async down({ context: { sequelize, transaction } }) {
    const query = sequelize.getQueryInterface();
    const q = ([name]: TemplateStringsArray) => query.quoteIdentifiers(name);
    await query.removeColumn("signup", "manualPaymentStatus", { transaction });
    await sequelize.query(`DROP TRIGGER IF EXISTS ${q`payment_validate_update`} ON ${q`payment`};`, { transaction });
    await sequelize.query(`DROP FUNCTION IF EXISTS ${q`payment_validate_update_fn`}();`, { transaction });
    await sequelize.query(`DROP TRIGGER IF EXISTS ${q`payment_completed_at_set_once`} ON ${q`payment`};`, {
      transaction,
    });
    await sequelize.query(`DROP FUNCTION IF EXISTS ${q`payment_completed_at_set_once_fn`}();`, { transaction });
    await sequelize.query(`DROP TRIGGER IF EXISTS ${q`payment_session_id_set_once`} ON ${q`payment`};`, {
      transaction,
    });
    await sequelize.query(`DROP FUNCTION IF EXISTS ${q`payment_session_id_set_once_fn`}();`, { transaction });
    await sequelize.query(`DROP TRIGGER IF EXISTS ${q`payment_immutable`} ON ${q`payment`};`, { transaction });
    await sequelize.query(`DROP FUNCTION IF EXISTS ${q`payment_immutable_fn`}();`, { transaction });
    await sequelize.query(`DROP TRIGGER IF EXISTS ${q`payment_prevent_delete`} ON ${q`payment`};`, { transaction });
    await sequelize.query(`DROP FUNCTION IF EXISTS ${q`payment_prevent_delete_fn`}();`, { transaction });
    await query.dropTable("payment", { transaction });
  },
});
