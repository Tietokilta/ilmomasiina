import { FastifyBaseLogger } from "fastify";
import { pino } from "pino";

import config from "./config";

const logger: FastifyBaseLogger = pino(
  {
    enabled: !["test", "bench"].includes(config.nodeEnv), // Enable logger when not testing or benchmarking
    level: "info",
  },
  process.stderr, // match debug() which isn't configurable
);

export default logger;
