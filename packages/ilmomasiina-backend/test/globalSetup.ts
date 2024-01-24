import { Sequelize } from 'sequelize';

import config from '../src/config';
import sequelizeConfig from '../src/models/config';

export default async function globalSetup() {
  // Delete all data from the test database.
  if (config.resetTestDbOnStart) {
    const sequelize = new Sequelize(sequelizeConfig.default);
    await sequelize.authenticate();
    await sequelize.getQueryInterface().bulkDelete('user', {}, { truncate: true, cascade: true } as any);
    // cascades to all other event data
    await sequelize.getQueryInterface().bulkDelete('event', {}, { truncate: true, cascade: true } as any);
    await sequelize.getQueryInterface().bulkDelete('auditlog', {}, { truncate: true, cascade: true } as any);
    await sequelize.close();
  }
}
