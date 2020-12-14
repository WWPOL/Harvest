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
          winston.format.errors({ stack: true }),
          winston.format.printf((i) => {
            let o = {...i};
            delete o.timestamp;
            delete o.service;
            delete o.level;
            delete o.message;
            delete o.stack;
            
            let ostr = "";
            if (Object.keys(o).length > 0) {
              ostr = ` ${JSON.stringify(o)}`;
            }

            let msgstr = i.message;
            if (typeof i.message !== "string") {
              msgstr = JSON.stringify(i.message);
            }

            let stackstr = "";
            if (i.stack !== undefined) {
              stackstr = `\n${i.stack}`;
            }
            
            return `${i.timestamp} [${i.service}] ${i.level} ${msgstr}${ostr}${stackstr}`;
          }),
        ),
      }),
    ],
  });
}

module.exports = makeLogger;
