require("dotenv").config();
const Discord = require("discord.js");
const search = require("./search");

const EnvConfig = require("./envconfig");

// Load application configuration
const cfg = EnvConfig("HARVEST_", {
  discord: {
    token: [ "DISCORD_TOKEN", "string" ],
  },
  torrent: {
    transmission: {
      host: [ "TRANSMISSION_HOST", "string" , "127.0.0.1" ],
      port: [ "TRANSMISSION_PORT", "integer", 9091 ],
      username: [ "TRANSMISSION_USERNAME", "string", "" ],
      password: [ "TRANSMISSION_PASSWORD", "string", "" ],
      ssl: [ "TRANSMISSION_SSL", "boolean", false ],
      url: [ "TRANSMISSION_URL", "string", "/transmission/rpc" ],
    },
    downloadDir: {
      path: [ "DOWNLOAD_DIR_PATH", "string", "./dev-resource-dl" ],
      maxBytes: [ "DOWNLOAD_DIR_MAX_BYTES", "integer", 5,368,706,371 ], // 5 Giga*Bytes*
    },
    mongo: {
      uri: [ "MONGO_URI", "string", "mongodb://127.0.0.1" ],
      dbName: [ "MONGO_DB_NAME", "string", "dev-harvest" ],
    },
  },
});

const client = new Discord.Client();

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const HELP_STRING = `Harvest accepts the following commands:
\`\`\`
- /h fetch <file_name>: returns a list of matching files and prompts user to select one
\`\`\``;

const REACTIONS = [
  "\u0030\u20E3",
  "\u0031\u20E3",
  "\u0032\u20E3",
  "\u0033\u20E3",
  "\u0034\u20E3",
  "\u0035\u20E3",
  "\u0036\u20E3",
  "\u0037\u20E3",
  "\u0038\u20E3",
  "\u0039\u20E3",
];

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    // eslint-disable-next-line
    await callback(array[index], index, array);
  }
};

const listMessages = {};
client.on("message", async (msg) => {
  // if channel id is set, only process if in proper channel, otherwise process regardless
  if (
    (process.env.CHANNEL_ID && msg.channel.id === process.env.CHANNEL_ID) ||
    !process.env.CHANNEL_ID
  ) {
    const authorId = msg.author.id;
    const args = msg.content.split(" ");
    // all harvest commands are prefaced with /h
    if (args[0] !== "/h") return;
    switch (args[1]) {
      case "fetch":
        const allResults = await search(args.slice(2).join(" "));
        const results = allResults.slice(0, 10); // just in case
        let reply = "Please select an option:\n```";
        results.forEach(
          (item, i) =>
            (reply += `\n - ${i}: ${item.name} [size: ${item.size}, seeders: ${item.seeders}]`)
        );
        reply += "```";
        msg.reply(reply).then(async (listMsg) => {
          listMessages[authorId] = {
            msgId: msg.id,
            listMsgId: listMsg.id,
            results,
          };
          await asyncForEach(results, async (_, i) => {
            await listMsg.react(REACTIONS[i]);
          });
        });
        break;
      case "help":
        msg.reply(HELP_STRING);
        break;
      default:
        msg.reply(
          `"${args[1]}" is not a valid command! Please use \`/h help\` to see the list of valid commands.`
        );
        break;
    }
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (listMessages.hasOwnProperty(user.id)) {
    const { msgId, listMsgId, results } = listMessages[user.id];
    if (reaction.message.id === listMsgId) {
      delete listMessages[user.id];
      const i = REACTIONS.indexOf(reaction.emoji.name);
      const msg = await reaction.message.channel.messages.fetch(msgId);
      msg.reply(
        `Going to download:\n\`\`\`${JSON.stringify(results[i], null, 2)}\`\`\``
      );

      
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
