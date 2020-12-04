require("dotenv").config();
const Discord = require("discord.js");
const search = require("./search");
const { MongoClient } = require("mongodb");
const Transmission = require("transmission");

const EnvConfig = require("./envconfig");

class ResourceFetcher {
  constructor(opts) {
    this.transmission = opts.transmission;
    this.db = opts.db;
  }

  getStatus(uri) {
    return {
      uri: uri,
      state: "verifying",
      message: "not implemented",
    };
  }
}

async function main() {
  // Load application configuration
  const cfg = EnvConfig("HARVEST_", {
    discord: {
      channelId: [ "DISCORD_CHANNEL", "string" ],
      token: [ "DISCORD_TOKEN", "string" ],
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

  // Connect to Transmission
  const transmission = new Transmission(cfg.torrent.transmission);

  // Connect to MongoDB
  const dbConn = await MongoClient.connect(cfg.mongo.uri, {
	  useUnifiedTopology: true
  });
  const dbClient = await dbConn.db(cfg.mongo.dbName);
  const db = {
    requests: await dbClient.collection("requests"),
	  resources: await dbClient.collection("resources"),
  };
  
  console.log("Connected to MongoDB");

  // Setup the resource fetcher
  const resourceFetcher = new ResourceFetcher({
    db: db,
    transmission: transmission,
  });

  // Setup discord
  const discord = new Discord.Client();

  discord.on("ready", async () => {
    console.log(`Logged in as ${discord.user.tag}!`);
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
  discord.on("message", async (msg) => {
    // if channel id is set, only process if in proper channel, otherwise process regardless
    if (msg.channel.id === cfg.discord.channelId) {
      const authorId = msg.author.id;
      const args = msg.content.split(" ");
      // all harvest commands are prefaced with /h
      if (args[0] !== "/h") return;
      switch (args[1]) {
      case "fetch":
        // Get top 10 matching torrents
        const allResults = await search(args.slice(2).join(" "));

        // Send message showing results
        const results = allResults.slice(0, 10); // just in case

        let reply = "Please select an option:\n```";
        results.forEach((item, i) => {
          reply += `\n - ${i}: ${item.name} [size: ${item.size}, seeders: ${item.seeders}]`;
        });
        reply += "```";
        
        const listMsg = await msg.reply(reply);

        // Record message details in database so we can figure out which item user
        //     is reacting to later.
        await db.requests.insertOne({
          authorId: authorId,
          requestMsgId: msg.id,
          listMsgId: listMsg.id,
          results: results,
          choose: null,
        });

        // React to message so user can select their choice
        await asyncForEach(results, async (_, i) => {
          await listMsg.react(REACTIONS[i]);
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

  discord.on("messageReactionAdd", async (reaction, user) => {
    // Get discord message for reaction
    const msg = await reaction.message.channel.messages.fetch(reaction.message.id);
    
    // Try to find a relevant request for the message
    const request = await db.requests.findOne({
      authorId: user.id,
      listMsgId: reaction.message.id,
      choose: null,
    });

    if (request === null) {
      // They are reacting to something we don't care about, or an old request, or
      // the reactor isn't the author. Ignore.
      return;
    }

    // Determine which thing they choose
    const choiceIndex = REACTIONS.indexOf(reaction.emoji.name);

    if (choiceIndex > request.results.length - 1) {
      return msg.reply(`Can only choose 1 through ${request.results.length}`);
    }
    const choose = request.results[choiceIndex];

    // Record choice
    await db.requests.updateOne({
      _id: request._id
    }, {
      $set: {
        ...request,
        choose: choose,
      },
    });
    
    // Determine status of choice
    const fetchStatus = resourceFetcher.getStatus(choose.url);

    return msg.reply(`${choose.name} is ${fetchStatus.state}, ${fetchStatus.message}`);
  });

  discord.login(cfg.discord.token);
}

main()
  .then(() => {
    console.log("Running");
  })
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
