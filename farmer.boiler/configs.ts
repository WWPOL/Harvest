const ENV = Deno.env.toObject();

let missingEnvs = new Set();

/**
 * Get environment variable or throw an error if it is missing or empty.
 * @param name Of env var.
 * @returns Env var value.
 * @throws If env var doesn't exist.
 */
function getEnv(name: string) {
  if (ENV[name] === undefined || ENV[name].length === 0) {
    missingEnvs.add(name);
  }

  return ENV[name];
}

const cfg = {
  /**
   * Discord authentication token.
   */
  token: getEnv("FARMER_DISCORD_BOT_TOKEN"),

  /**
   * Discord owner notification channel ID.
   */
  ownerChannelId: getEnv("FARMER_DISCORD_OWNER_CHANNEL_ID"),
};

if (missingEnvs.size > 0) {
  throw `Missing environment variables: ${Array.from(missingEnvs).join(", ")}`;
}

export const configs = {
  /**
   * Discord authentication token.
   */
  token: cfg.token,
  prefix: "!",
  /**
   * This isn't required but you can add bot list api keys here.
   * OPTIONAL.
   */
  botListTokens: {
    DISCORD_BOTS_CO: "",
    DISCORD_BOT_ORG: "",
    BOTS_ON_DISCORD: "",
    DISCORD_BOT_LIST: "",
    BOTS_FOR_DISCORD: "",
    DISCORD_BOATS: "",
    DISCORD_BOTS_GG: "",
    DISCORD_BOTS_GROUP: "",
  },
  /**
   * This is the server id for your bot's main server where users can get help/support.
   * OPTIONAL.
   */
  supportServerID: "",
  /**
   * These are channel ids that will enable some functionality.
   */
  channelIDs: {
    /**
     * When a translation is missing this is the channel you will be alerted in.
     */
    missingTranslation: cfg.ownerChannelId,
    /**
     * When an error occurs, we will try and log it to this channel.
     */
    errorChannelID: cfg.ownerChannelId,
  },
  /**
   * These are the role ids that will enable some functionality.
   * OPTIONAL.
   */
  roleIDs: {
    /**
     * If you have a patreon set up you can add the patreon vip role id here.
     * OPTIONAL.
     */
    patreonVIPRoleID: "",
  },
  /**
   * These are the user ids that will enable some functionality.
   */
  userIDs: {
    /**
     * The user ids for the support team.
     * OPTIONAL.
     */
    botSupporters: [] as string[],
    /**
     * The user ids for the other devs on your team.
     * OPTIONAL.
     */
    botDevs: [] as string[],
    /**
     * The user ids who have complete 100% access to your bot.
     * OPTIONAL.
     */
    botOwners: [] as string[],
  },
};
