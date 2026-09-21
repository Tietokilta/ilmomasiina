import { faker } from "@faker-js/faker";

import config from "../src/config";
import setupDatabase from "../src/models";
import { testEvent, testSignups } from "./testData";

// Allows filling up the database with test events for performance testing.

const NUM_EVENTS = 2000;
const NUM_SIGNUPS_PER_EVENT = { min: 10, max: 200 };

if (!config.allowTestsToResetDb) {
  throw new Error(
    "THIS_IS_A_TEST_DB_AND_CAN_BE_WIPED=1 must be set to run fillDatabase.ts.\n" +
      `Warning: This script will insert ${NUM_EVENTS} with random signups into ` +
      `your database '${config.dbDatabase}' on ${config.dbHost}.`,
  );
}

async function main() {
  await setupDatabase();

  for (let i = 0; i < NUM_EVENTS; i++) {
    process.stderr.write(`\rCreating test events: ${i + 1}/${NUM_EVENTS}...`);
    // eslint-disable-next-line no-await-in-loop
    const event = await testEvent();
    // eslint-disable-next-line no-await-in-loop
    await testSignups({
      event,
      count: faker.number.int(NUM_SIGNUPS_PER_EVENT),
    });
  }
}

void main(); // no top-level await in CJS
