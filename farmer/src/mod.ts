import { MongoClient, Bson } from "https://deno.land/x/mongo@v0.20.1/mod.ts";
import { Intents, startBot } from "https://deno.land/x/discordeno@10.0.0/mod.ts";


/**
 * Structure of database object IDs.
 */
interface DbId {
  /**
   * Unique ID.
   */
  _id: { $oid: string },
}

/**
 * User.
 */
interface User extends DbId {
  /**
   * Display name of user.
   */
  displayName: string,

  /**
   * ID of linked Discord user.
   */
  discordId?: string,
}

/**
 * Indicates the status of the fetching of a resource.
 */
enum FetchStatus {
  /**
   * Determining if the resource can be downloaded.
   */
  Verifying,

  /**
   * Retrieving resource contents.
   */
  Downloading,

  /**
   * Succeeded in retrieving resource.
   */
  Succeeded,

  /**
   * Failed in retrieving resource.
   */
  Failed,
}

/**
 * Indicates the type of media.
 */
enum MediaType {
  /**
   * A TV show.
   */
  TVShow,

  /**
   * A movie.
   */
  Movie,

  /**
   * Media not part of any series.
   */
  OneOff,
}

/**
 * Metadata indicating the type of media.
 */
interface MediaMetadata {
  /**
   * Type of media.
   */
  mediaType: MediaType,

  /**
   * IMDB title ID.
   */
  imdbTitleId: string,

  /**
   * Poster photo URL.
   */
  posterURL: string,

  /**
   * Name of media.
   */
  name: string,

  /**
   * Description of media.
   */
  description: string,

  /**
   * Main people associated with the media.
   */
  mainPeople: string[],

  /**
   * Metadata only available for TV shows.
   */
  tvShow?: {
    /**
     * Season number.
     */
    seasonNum: number,

    /**
     * Episode number.
     */
    episodeNum: number,

    /**
     * Episode name.
     */
    episodeName: string,
  },
}


/**
 * Media resource.
 */
interface Resource extends DbId {
  /**
   * Resource URI.
   */
  uri: string,

  /**
   * Resource metadata.
   */
  metadata: MediaMetadata,

  /**
   * Status of fetching resource.
   */
  fetchStatus: FetchStatus,

  /**
   * Message containing human readable details of resource fetch process.
   */
  fetchMessage: string,

  /**
   * Storage device on which resource data is located. Value should be the logical ID.
   */
  storageDevice: string,

  /**
   * Path on storage device on which resource is located.
   */
  storagePath: string,
}

/**
 * Resource request query result.
 */
interface RequestQueryResult {
  /**
   * Resource URI.
   */
  uri: string,

  /**
   * Media metadata.
   */
  metadata: MediaMetadata,
}

/**
 * Resource request.
 */
interface ResourceRequest extends DbId {
  /**
   * Requesting user's ID.
   */
  requesterId: string,
  
  /**
   * Raw query string sent by user.
   */
  query: string,

  /**
   * Query results.
   */
  results?: RequestQueryResult[],

  /**
   * Index of choice in .results.
   */
  choice?: number,

  /**
   * True if the request has been approved by an admin.
   */
  approved?: boolean,

  /**
   * ID of resource which was eventually created to fulfill the request.
   */
  fullfilledResourceId?: string,
}

/**
 * Retrieves environment variables and notes missing vars.
 */
class EnvGetter {
  /**
   * The environment at the time of class construction.
   */
  env: object;

  /**
   * Names of environment variables which are missing.
   */
  missing: Set<string>;

  constructor() {
    this.env = Deno.env.toObject();
    this.missing = new Set();
  }

  /**
   * Get environment variable, has functionality for default values. Records env vars which
   * are missing in .missing;
   * @param name Of env var.
   * @param defaultVal Value to use if the env var does not exist. If this argument not 
   * undefined a missing env var will not be recorded.
   * @returns Env var value.
   */
  getEnv(name: string, defaultVal?: any) {
    if (env[name] === undefined || env[name].length === 0) {
      if (defaultVal !== undefined) {
        return defaultVal;
      }
      
      this.missing.add(name);
    }
    return env[name];
  }

  /**
   * Check if any missing environment variables are present. If any missing throw 
   * an exception.
   * @throws Error If any env vars missing.
   */
  check() {
    if (this.missing.size > 0) {
      throw new Error(`Missing environment variables: ${Array.from(this.missing).join(", ")}`);
    }
  }
}

/**
 * Application configuration.
 */
interface Config {
  /**
   * Mongo database configuration.
   */
  mongo: {
    /**
     * Connection URI.
     */
    uri: string,

    /**
     * Database name.
     */
    db: string,
  },

  /**
   * Resource storage locations. Configured via the FARMER_STORAGE env var. Should be a 
   * semi-colon delimited list where each item is in the form <name>=<path>. Where name
   * is a logical ID and <path> is a path to the storage location.
   * 
   * This storage key is a map where keys are the <name>s and values are the <path>s.
   */
  storage: {[key: string]: string},

  /**
   * Discord bot configuration.
   */
  discord: {
    /**
     * Bot authentication token.
     */
    botToken: string,

    /**
     * Bot command prefix. Defaults to "!farmer ".
     */
    botPrefix: string,
  },
}

/**
 * Main logic which handles all aspects of farmer functionality. Made into an object so
 * basic setup context can be shared across many worker threads.
 */
class Main {
  cfg: Config;

  /**
   * Initialize main context.
   * @throws Error If a failure in initialization occurs.
   */
  constructor() {
    this.cfg = {
      mongo: {
        uri: getEnv("FARMER_MONGO_URI"),
        db: getEnv("FARMER_MONGO_DB"),
      },

      storage: (() => {
        const storage: {[key: string]: string} = {};
        
        getEnv("FARMER_STORAGE").split(";").forEach((s: string) => {
          const parts = s.split("=");
          
          if (parts.length <= 1) {
            throw `Failed to parse FARMER_STORAGE, list item "${s}" not in <name>=<path> format`;
          }
          
          const name = parts[0];
          const path = parts.slice(1).join("=");

          storage[name] = path;
        });

        return storage;
      })(),

      discord: {
        botToken: getEnv("FARMER_DISCORD_BOT_TOKEN"),
        botPrefix: getEnv("FARM_ERDISCORD_BOT_PREFIX", "!farmer "),
      },
    };

    if (Object.keys(cfg.storage).length === 0) {
      throw "Must configure at least one storage location via FARMER_STORAGE";
    }
    
    // Connect to DB
    const dbClient = new MongoClient();
    await dbClient.connect(cfg.mongo.uri);

    console.log("Connected to MongoDB");

    const db = await dbClient.database(cfg.mongo.db);
    const dbUsers = db.collection<User>("users");
    const dbResources = db.collection<Resource>("resources");
    const dbResourceRequests = db.collection<ResourceRequest>("resource_requests");

    // Run Discord client
    startBot({
      token: cfg.discord.botToken,
      intents: [
        Intents.GUILDS,
        Intents.GUILD_MESSAGES,
        Intents.GUILD_MESSAGE_REACTIONS,
        Intents.GUILD_EMOJIS,
        Intents.DIRECT_MESSAGES,
        Intents.DIRECT_MESSAGE_REACTIONS,
      ],
      eventHandlers: {
        /**
         * On Discord bot ready.
         */
        ready() {
          console.log("Successfully connected Discord");
        },

        /**
         * On message created.
         */
        messageCreate(msg) {
          // Ensure command using correct prefix
          if (msg.content.indexOf(cfg.discord.botPrefix) !== 0) {
            return;
          }

          // Run corresponding command
          const cmd = msg.content.slice(0, cfg.discord.botPrefix.length);
          switch (cmd) {
            case "help":
              return msg.reply({
                embed: {
                  title: "Help",
                  description: "Bot which helps retrieve and manage media. Use the following commands.",
                  fields: [
                    {
                      name: "!help",
                      value: "Show this help message.",
                    },
                    {
                      name: "!fetch <query>",
                      value: "Search for media using `<query>` and allow the user to select which media to retrieve.",
                    },
                  ],
                },
              });
              break;
            case "fetch":
              return msg.reply("hello fetch");
              break;
            default:
              return msg.reply(`Error: Unknown command \`${cmd}\``);
              break;
          }
        },

        /**
         * On react added to message.
         */
        reactionAdd(payload, emoji, userId, msg) {
          console.log("On reaction add, payload", payload);
        },
      },
    });
  }
}
