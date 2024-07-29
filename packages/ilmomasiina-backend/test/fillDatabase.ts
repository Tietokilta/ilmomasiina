import { faker } from '@faker-js/faker';

import config from '../src/config';
import { testEvent, testSignups } from './testData';

// Allows filling up the database with test events for performance testing.

const NUM_EVENTS = 2000;
const NUM_SIGNUPS_PER_EVENT = { min: 10, max: 200 };

if (!config.allowTestsToResetDb) {
  throw new Error(
    'THIS_IS_A_TEST_DB_AND_CAN_BE_WIPED=1 must be set to run fillDatabase.ts.\n'
    + `Warning: This script will insert ${NUM_EVENTS} with random signups into `
    + `your postgres DB '${config.dbDatabase}' on ${config.dbHost}.`,
  );
}

/* eslint-disable no-await-in-loop */
async function main() {
  for (let i = 0; i < NUM_EVENTS; i++) {
    process.stderr.write(`\rCreating test events: ${i + 1}/${NUM_EVENTS}...`);
    const event = await testEvent();
    await testSignups(event, { count: faker.number.int(NUM_SIGNUPS_PER_EVENT) });
  }
}

main();
