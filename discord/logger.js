const winston = require("winston");

/**
 * Create a new logger.
 * @param name Name of component of program.
 * @returns Logger for program.
 */
function makeLogger(name) {
  return winston.createLogger({
    level: "debug",
    format: winston.format.json(),
    defaultMeta: {
      service: name,
    },
    transports: [
      new winston.transports.Console({
        level: "debug",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf((i) => {
            return `${i.timestamp} [${i.service}] ${i.level} ${i.message}`;
          }),
        ),
      }),
    ],
  });
}

module.exports = makeLogger;
