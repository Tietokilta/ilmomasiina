import debug from 'debug';
import { Sequelize } from 'sequelize';
import { SequelizeStorage, Umzug } from 'umzug';

import setupAnswerModel, { Answer } from './answer';
import setupAuditLogModel from './auditlog';
import sequelizeConfig from './config';
import setupEventModel, { Event } from './event';
import migrations from './migrations';
import setupQuestionModel, { Question } from './question';
import setupQuotaModel, { Quota } from './quota';
import setupSignupModel, { Signup } from './signup';
import setupUserModel from './user';

const debugLog = debug('app:db');

let sequelize: Sequelize | null = null;

export function getSequelize() {
  if (!sequelize) throw new Error('setupDatabase() has not been called');
  return sequelize;
}

export async function closeDatabase() {
  if (sequelize) {
    const old = sequelize;
    sequelize = null;
    await old.close();
  }
}

async function runMigrations() {
  if (!sequelize) throw new Error();
  const storage = new SequelizeStorage({ sequelize });

  debugLog('Running database migrations');
  const umzug = new Umzug({
    migrations,
    storage,
    logger: console,
    context: sequelize,
  });
  await umzug.up();
}

export default async function setupDatabase() {
  if (sequelize) return sequelize;

  debugLog('Connecting to database');
  sequelize = new Sequelize(sequelizeConfig.default);
  try {
    await sequelize.authenticate();
    const cfg = (sequelize.connectionManager as any).config;
    debugLog(`Connected to ${cfg.host} as ${cfg.username}.`);
  } catch (err) {
    const cfg = (sequelize.connectionManager as any).config;
    console.error(`Error connecting to ${cfg.host} as ${cfg.username}: ${err}`);
    throw err;
  }

  setupEventModel(sequelize);
  setupQuotaModel(sequelize);
  setupSignupModel(sequelize);
  setupQuestionModel(sequelize);
  setupAnswerModel(sequelize);
  setupUserModel(sequelize);
  setupAuditLogModel(sequelize);

  Event.hasMany(Question, {
    foreignKey: {
      allowNull: false,
    },
    onDelete: 'CASCADE',
  });
  Question.belongsTo(Event);

  Event.hasMany(Quota, {
    foreignKey: {
      allowNull: false,
    },
    onDelete: 'CASCADE',
  });
  Quota.belongsTo(Event);

  Quota.hasMany(Signup, {
    foreignKey: {
      allowNull: false,
    },
    onDelete: 'CASCADE',
  });
  Signup.belongsTo(Quota);

  Signup.hasMany(Answer, {
    foreignKey: {
      allowNull: false,
    },
    onDelete: 'CASCADE',
  });
  Answer.belongsTo(Signup);

  Question.hasMany(Answer, {
    foreignKey: {
      allowNull: false,
    },
    onDelete: 'CASCADE',
  });
  Answer.belongsTo(Question);

  await runMigrations();

  return sequelize;
}
