import debug from "debug";
import { exit } from "process";

import initApp from "../app";
import config from "../config";

const debugLog = debug("app:bin:server");

initApp()
  .then(async (fastify) => {
    const { host, port } = config;

    const addr = await fastify.listen({ host, port });

    await fastify.ready();

    const url = config.nodeEnv === "development" ? `http://${addr}` : config.baseUrl;
    debugLog(`Server is now running at ${url}.`);
  })
  .catch((err: unknown) => {
    console.error("Failed to initialize app", err);
    exit(1);
  });
