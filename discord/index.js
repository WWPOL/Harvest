require("dotenv").config();
const Discord = require("discord.js");
const { MongoClient } = require("mongodb");
const Transmission = require("transmission");
const thepiratebay = require("thepiratebay");

const EnvConfig = require("./envconfig");

const COLOR_PRIMARY_HEX = "#d754e4";

const DISCORD_BOT_PERMISSIONS = "3271232";

const HELP_STRING = `Harvest accepts the following commands:
\`\`\`
- /h fetch <file_name>: returns a list of matching files and prompts user to select one
- /h invite: provides a link to invite me to your server
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

/**
 * Search for resources based on the query.
 * @param query Text string to search.
 * @returns Array of 10 result objects from https://www.npmjs.com/package/thepiratebay
 */
async function search(query) {
  return (await thepiratebay.search(query, {
    category: "video",
    page: 0,
  })).slice(0, 10);
};

class ResourceFetcher {
  constructor(opts) {
    this.discord = opts.discord;
    this.transmission = opts.transmission;
    this.db = opts.db;
  }

  _promisify(fn) {
    return new Promise((resolve, reject) => {
      return fn((err, arg) => {
        if (err !== undefined && err !== null) {
          return reject(err);
        }

        return resolve(arg);
      });
    });
  }

  await updateStatusMsg(requestId) {
    // Get request
    const request = await this.db.requests.findOne({
      _id: requestId,
    });

    if (request === null || request.discord.statusMsgId === undefined) {
      return;
    }

    // Get status msg
    const msg = await this.discord.messages.fetch(reaction.message.id);
  }

  async download(requestId, uri) {
    const handle = await this._promisify((cb) => {
      this.transmission.addUrl(uri, cb);
    });

    const status = (await this._promisify((cb) => {
      this.transmission.get(handle.id, cb);
    }))[0];

    await this.db.requests.updateOne({
      _id: requestId,
    }, {
      $set: {
        torrent: {
          transmissionId: handle.id,
          name: handle.name,
          hashString: handle.hashString,
          status: {
            flags: {
              downloading: true,
              done: status.doneDate !== 0,
            },
            progress: status.percentDone,
            downloadRate: status.rateDownload
            numPeers: status.peersSendingToUs,
            eta: status.eta,
          },
        },
      }
    });
  }
}

async function main() {
  // Load application configuration
  const cfg = EnvConfig("HARVEST_", {
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

  const checkingDiscordChannel = cfg.discord.channelId !== "NOT_CHECKING";
  if (checkingDiscordChannel === false && process.env.NODE_ENV === "production") {
    throw "Not allowed to disregard the Discord message recipient in production";
  }
  
  if (checkingDiscordChannel === false) {
    console.log("Not checking Discord channel recipients");
  }
  
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

  // Setup discord
  const discord = new Discord.Client();
  discord.login(cfg.discord.token);

    // Setup the resource fetcher
  const resourceFetcher = new ResourceFetcher({
    discord: discord,
    db: db,
    transmission: transmission,
  });

  // Define bot beavior
  discord.on("ready", async () => {
    console.log(`Logged in as ${discord.user.tag}!`);
  });

  const listMessages = {};
  discord.on("message", async (msg) => {
    // if channel id is set, only process if in proper channel, otherwise process regardless
    const sentToMe = checkingDiscordChannel === false || msg.channel.id === cfg.discord.channelId;
    const notMe = msg.author.id !== discord.user.id;
    
    if (sentToMe && notMe) {
      const authorId = msg.author.id;
      const args = msg.content.split(" ");
      // all harvest commands are prefaced with /h
      if (args[0] !== "/h") return;
      
      switch (args[1]) {
      case "fetch":
        // React to msg so they know we are searching
        await msg.react("🔎"); // Magnifying glass, :mag:
        
        // Get top 10 matching torrents
        const query = args.slice(2).join(" ");
        const results = await search(query);
        const emptyResults = results.length === 1 && results[0].id === "0" && results[0].name === "No results returned";

        let desc = ""
        let fields = [];
        if (emptyResults === true) {
          desc = "No results."
        } else {
          desc = "Select option to download:\n\n";
          desc += results.map((item, i) => {
            return `**${i}** (🌱${item.seeders}, ${item.size})\n_${item.name}_`;
            }).join("\n\n");
        }
        
        const listMsg = await msg.reply({
          embed: {
            title: `❯ :mag: "${query}"`,
            description: desc,
            hexColor: COLOR_PRIMARY_HEX,
          },
        });

        if (emptyResults === true) {
          return;
        };

        await Promise.all([
          // Record message details in database so we can figure out which item user
          //     is reacting to later.
          await db.requests.insertOne({
            discord: {
              authorId: authorId,
              requestMsgId: msg.id,
              listMsgId: listMsg.id,
            },
            results: results,
            choice: null,
          }),
          // React to message so user can select their choice
          await Promise.all(results.map(async (_, i) => {
            return listMsg.react(REACTIONS[i]);
          })),
        ]);
        break;
      case "invite":
        msg.reply({
          embed: {
            title: "Invite Harvest",
            description: "Invite me to your server",
            url: `https://discord.com/oauth2/authorize?client_id=${cfg.discord.clientId}&scope=bot&permissions=${DISCORD_BOT_PERMISSIONS}`,
            hexColor: COLOR_PRIMARY_HEX,
          },
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

  /**
   * The bot receives user input based  on reactions, just like it does messages.
   */
  discord.on("messageReactionAdd", async (reaction, user) => {
    // Get discord message for reaction
    const msg = await reaction.message.channel.messages.fetch(reaction.message.id);

    if(user.id === discord.user.id) {
      // Ignore our own reactions
      return;
    }
    
    // Try to find a relevant request for the message
    const request = await db.requests.findOne({
      "discord.listMsgId": reaction.message.id,
    });

    if (request === null) {
      // They are reacting to something we don't care about, or an old request, or
      // the reactor isn't the author. Ignore and remove.
      return;
    }

    if (request.discord.authorId !== user.id || request.choice !== null) {
      console.log("removed react", request.discord.authorId, user.id, request.choice);
      return reaction.remove();
    }

    // Determine which thing they choose
    const choiceIndex = REACTIONS.indexOf(reaction.emoji.name);

    if (choiceIndex > request.results.length - 1) {
      // Can only choose 1 through request.results.length
      return reaction.remove();
    }
    
    const choice = request.results[choiceIndex];
    
    // Determine status of choice
    await resourceFetcher.download(request._id, choice.magnetLink);

    const statusMsg = msg.reply({
      embed: {
        title: `🌾 ${choice.name}`,
        description: "🤔 Verifying...",
        hexColor: COLOR_PRIMARY_HEX,
      },
    });
    
    // Record choice
    await db.requests.updateOne({
      _id: request._id
    }, {
      $set: {
        ...request,
        choice: choice,
        discord: {
          statusMsgId: statusMsg.id,
        },
      },
    });
  });
}

main()
  .then(() => {
    console.log("Running");
  })
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
