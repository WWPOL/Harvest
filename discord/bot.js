require("dotenv").config();

const Transmission = require("transmission");
const thepiratebay = require("thepiratebay");

const makeLogger = require("./logger");

const getConfig = require("./config");
const makeDiscordClient = require("./discord");
const connectToDB = require("./db");
const ResourceFetcher = require("./resourceFetcher");

const COLORS = require("./colors");

// Make logger
const LOG = makeLogger("discord-bot");

/**
 * Permissions required by the Discord bot. Encoded for the Discord API using this number.
 * Asks for the following permissions:
 *   - Send messages
 *   - Manage messages
 *   - Embed links
 *   - Attach files
 *   - Read message history
 *   - Add reactions
 *   - Connect to voice chat
 *   - Speak in voice chat
 */
const DISCORD_BOT_PERMISSIONS = "3271232";

/**
 * Discord bot help message. A user manual.
 */
const HELP_STRING = `Harvest accepts the following commands:
\`\`\`
- /h fetch <file_name>: returns a list of matching files and prompts user to select one
- /h invite: provides a link to invite me to your server
\`\`\``;

/**
 * Numeric reactios 0-9. Index in this array is their numeric value.
 */
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

/**
 * Run Discord bot listener.
 * @returns Promise which resolves when the Discord bot is all setup.
 */
async function main() {
  // Load application configuration
  const cfg = getConfig();

  const checkingDiscordChannel = cfg.discord.channelId !== "NOT_CHECKING";
  if (checkingDiscordChannel === false && process.env.NODE_ENV === "production") {
    throw "Not allowed to disregard the Discord message recipient in production";
  }
  
  if (checkingDiscordChannel === false) {
    LOG.warn("Not checking Discord channel recipients");
  }
  
  // Connect to Transmission
  const transmission = new Transmission(cfg.torrent.transmission);
  LOG.info("Connected to Transmission");

  // Connect to MongoDB
  const db = await connectToDB(cfg);
  LOG.info("Connected to MongoDB");

  // Setup discord
  const discord = makeDiscordClient();

  // Setup the resource fetcher
  const resourceFetcher = new ResourceFetcher({
    discord: discord,
    db: db,
    transmission: transmission,
  });

  // Define bot beavior
  discord.on("ready", async () => {
    LOG.info(`Logged in as ${discord.user.tag}!`);
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
            return `**#${i}** (🌱${item.seeders}, ${item.size})\n_${item.name}_`;
          }).join("\n\n");
        }
        
        const listMsg = await msg.reply({
          embed: {
            title: `❯ :mag: "${query}"`,
            description: desc,
            hexColor: COLORS.PRIMARY_HEX,
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
              channelId: msg.channel.id,
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
            hexColor: COLORS.PRIMARY_HEX,
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
   * The bot receives user input based on reactions, just like it does messages.
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
      LOG.info("Ignoring no request");
      return;
    }

    if (request.discord.authorId !== user.id || request.choice !== null) {
      LOG.info("removed react", request.discord.authorId, user.id, request.choice);
      return reaction.remove();
    }

    // Determine which thing they choose
    const choiceIndex = REACTIONS.indexOf(reaction.emoji.name);

    if (choiceIndex > request.results.length - 1) {
      // Can only choose 1 through request.results.length
      return reaction.remove();
    }
    
    const choice = request.results[choiceIndex];
    
    // Send status message
    const statusMsg = await msg.reply({
      embed: {
        title: `🌾 ${choice.name}`,
        description: "🤔 Verifying...",
        hexColor: COLORS.PRIMARY_HEX,
      },
    });

    // Record choice
    await db.requests.updateOne({
      _id: request._id
    }, {
      $set: {
        choice: choice,
        "discord.statusMsgId": statusMsg.id,
      },
    });

    // Register download
    await resourceFetcher.download(request._id);
  });
  
  await discord.login(cfg.discord.token);
}

main()
  .then(() => {
    LOG.info("Discord listening");
  })
  .catch((e) => {
    LOG.error("Error:", e);
    process.exit(1);
  });
