import { FastifyInstance } from 'fastify';
import { Sequelize } from 'sequelize';

/* eslint-disable no-var, vars-on-top */
declare global {
  var server: FastifyInstance;
  var sequelize: Sequelize;
}
