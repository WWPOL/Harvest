const Discord = require("discord.js");

/**
 * Create and setup a Discord client for the application.
 * @returns Discord client.
 */
function makeDiscordClient() {
  return new Discord.Client({
    // Partials needed so we can receive events for uncached messages.
    // From: https://github.com/discordjs/discord.js/issues/4321#issuecomment-650574872
    partials: ["MESSAGE", "CHANNEL", "REACTION" ],
  });
}

module.exports = makeDiscordClient;
