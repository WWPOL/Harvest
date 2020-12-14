require("dotenv").config();

const Transmission = require("transmission");

const getConfig = require("./config");
const makeDiscordClient = require("./discord");
const connectToDB = require("./db");
const ResourceFetcher = require("./resourceFetcher");

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
  console.log("Connected to MongoDB");
  
  const discord = makeDiscordClient();
  await discord.login(cfg.discord.token);
  console.log("Authenticated with Discord API");

  const transmission = new Transmission(cfg.torrent.transmission);
  console.log("Connected to Transmission");

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
    console.log("Status updater done updating");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error running status updater", e);
    process.exit(1);
  });
