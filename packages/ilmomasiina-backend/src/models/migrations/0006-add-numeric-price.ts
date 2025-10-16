import { defineMigration } from "./util";

export default defineMigration({
  name: "0006-add-numeric-price",
  async up({ context: { sequelize } }) {
    const query = sequelize.getQueryInterface();
    await query.addColumn("event", "numPrice", {
      type: "FLOAT",
      allowNull: false,
      defaultValue: 0,
    });
  },
  async down({ context: { sequelize } }) {
    const query = sequelize.getQueryInterface();
    await query.removeColumn("event", "numPrice");
  }
});
