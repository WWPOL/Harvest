require("dotenv").config();

const Transmission = require("transmission");

// Make logger
const makeLogger = require("./logger");
const getConfig = require("./config");
const makeDiscordClient = require("./discord");
const connectToDB = require("./db");
const ResourceFetcher = require("./resourceFetcher");

// Make logger
const LOG = makeLogger("status-updater");

/**
 * Wait asynchronously.
 * @param ms The number of milliseconds to wait.
 * @returns A promise which resolves when done waiting.
 */
async function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

/**
 * Run status updater in a loop.
 */
async function main() {
  // Connect and get config ect
  const cfg = getConfig();
  
  const db = await connectToDB(cfg);
  LOG.info("Connected to MongoDB");
  
  const discord = makeDiscordClient();
  await discord.login(cfg.discord.token);
  LOG.info("Authenticated with Discord API");

  const transmission = new Transmission(cfg.torrent.transmission);
  LOG.info("Connected to Transmission");

  const resourceFetcher = new ResourceFetcher({
    db: db,
    discord: discord,
    transmission: transmission,
  });

  // Run status updater
  while (true) {
    await resourceFetcher.updateAll();
    await wait(1000);
  }
}

main()
  .then(() => {
    LOG.info("Status updater done updating");
    process.exit(0);
  })
  .catch((e) => {
    LOG.error("Error running status updater", e);
    process.exit(1);
  });
