const { Worker } = require("worker_threads");

const makeLogger = require("./logger");

// Make logger
const LOG = makeLogger("index");

/**
 * Run a worker thread.
 * @params filename The NodeJs Javascript entrypoint
 * @returns Promise which resolves when the thread finishes and rejects if it fails.
 */
async function run(filename) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(filename);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code === 0) {
        return resolve();
      }

      return reject(`Exited with non-zero code: ${code}`);
    });
  });
}

/**
 * Start the bot listener and the status updater threads.
 * @returns Promise which resolves when the program is done and rejects on an error.
 */
async function main() {
  await Promise.all([
    run("./bot.js"),
    run("./statusUpdater.js"),
  ]);
}

main()
  .then(() => {
    log.info("Done");
    process.exit(0);
  })
  .catch((e) => {
    log.error("Error", e);
    process.exit(1);
  });
