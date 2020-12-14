const EnvConfig = require("./envconfig");

/**
 * Get the application configuration.
 * @returns configuration.
 */
function getConfig() {
  return EnvConfig("HARVEST_", {
    discord: {
      // Can be "NOT_CHECKING" to accept messages from anywhere
      channelId: [ "DISCORD_CHANNEL", "string" ],
      token: [ "DISCORD_TOKEN", "string" ],
      clientId: [ "DISCORD_CLIENT_ID", "string" ],
    },
    torrent: {
      transmission: {
        host: [ "TRANSMISSION_HOST", "string" , "127.0.0.1" ],
        port: [ "TRANSMISSION_PORT", "integer", "9091" ],
        username: [ "TRANSMISSION_USERNAME", "string", "" ],
        password: [ "TRANSMISSION_PASSWORD", "string", "" ],
        ssl: [ "TRANSMISSION_SSL", "boolean", "false" ],
        url: [ "TRANSMISSION_URL", "string", "/transmission/rpc" ],
      },
      downloadDir: {
        path: [ "DOWNLOAD_DIR_PATH", "string", "./dev-resource-dl" ],
        maxBytes: [ "DOWNLOAD_DIR_MAX_BYTES", "integer", "5368706371" ], // 5 Giga*Bytes*
      },
    },
    mongo: {
      uri: [ "MONGO_URI", "string", "mongodb://127.0.0.1" ],
      dbName: [ "MONGO_DB_NAME", "string", "dev-harvest" ],
    },
  });
}

module.exports = getConfig;
