const COLORS = require("./colors");

/**
 * Ensure sets are equal. From: https://stackoverflow.com/a/44827922.
 * @param a Set.
 * @param b Set.
 * @returns {boolean}
 */
function setsEq (a, b) {
  return a.size === b.size && [...a].every(value => b.has(value));
}

/**
 * Round to a number of decimal places.
 * @param value To round.
 * @param places Number of decimal places.
 * @returns Rounded number.
 */
function roundTo(value, places) {
  return parseFloat(value.toString()).toFixed(places);
  const p = 10^places;
  return Math.round((value + Number.EPSILON) * p) / p;
}

/**
 * <pre>
 * Fetches a resource and download it onto the server.
 * The download process of each resource is a state machine implemented by this class. The
 * state machine's state for each resource is stored in MongoDB in the `requests` 
 * collection. The state machine is driven by repeatedly calling the download() method.
 * Note that the download method has to be called for each resource. Calling download() on
 * resources which have reached a terminal state will not break anything but it causes
 * unnecessary computation. The .torrent.status.inProgress field indicates if the 
 * download() method still needs to be called for a resource. Once a resource reaches a
 * terminal state download() will set this field to false. The updateAll() method 
 * automatically calls download() on only resources who need it. There is no state field
 * which explicitly marks what state a resource is in. Instead preconditions are implmented
 * in download() in a way which results in these distinct states.
 *
 * The states and their transitions are roughly:
 *
 * Initial state: ASKING_USER
 * Terminal states: SEEDING, FAILED
 *
 * ASKING_USER:
 *   Description: The bot has found search results for a user and is waiting for the user
 *                to select a choice. At this point the ResourceFetcher doesn't do anything
 *                and just exits, since the user hasn't told us what to download yet.
 *   Guaranteed state fields: .discord (all subfields), results
 *   Transitions:
 *     -> SELECTED if the user selects a choice of what to download.
 *
 * SELECTED:
 *   Description: The bot has recorded a user's choice from Discord but the download 
 *                process has not been started
 *   Guaranteed state fields: all from ASKING_USER + .choice
 *   Transitions:
 *     -> DOWNLOADING as soon as the SELECTED state is reached the download process is
 *          started and this state is transitioned to.
 *
 * DOWNLOADING:
 *   Description: Transmission is downloading a resource.
 *   Guaranteed state fields: all from SELECTED + .torrent
 *   Transitions:
 *     -> SEEDING if the download successfully finishes
 *     -> FAILED if an error occurs with the download
 *
 * SEEDING:
 *   Description: After a download succeeeds Transmission will begin seeding
 *   Gaurenteed state fields: all from SELECTED
 *   Transitions: none, this state is terminal
 * 
 * FAILED:
 *   Description: After a resource cannot be downloaded using Transmission
 *   Guaranteed state fields: all from SELECTED + .error
 *   Transitions: none, this state is terminal
 * </pre>
 */
class ResourceFetcher {
  /**
   * Creates a new resource fetcher.
   * @param opts Object which provides objects required to fetch resources. Must have keys
   *     discord (Discord.Client), transmission (Transmission), db (custom db object),
   *     log (Winston logger).
   * @throws {string} If opts is not correctly structured.
   */
  constructor(opts) {
    const haveOpts = new Set(Object.keys(opts));
    const expectedOpts = new Set(["discord", "transmission", "db", "log"]);
    if (setsEq(haveOpts, expectedOpts) === false) {
      throw `Configuration object must have exactly keys: ${Array.from(expectedOpts).join(", ")}`;
    }
    
    this.discord = opts.discord;
    this.transmission = opts.transmission;
    this.db = opts.db;
    this.log = opts.log;
  }

  /**
   * Allows a standard callback based asynchronous functions to be turned into promise
   * based functions. This function only works on functions who's callback function
   * signature is (error, value) where error will be undefined or null if there is no
   * error, and the result will be provided as the second argument.
   * @param fn A function which calls the function you want to promisify, a wrapper
   *     function. This should not be the function you want to promisify. This fn argument
   *     will be called with a special callback function as its only argument. This special
   *     callback function should be passed to the function you wish to promisify. It will
   *     handling rejecting and resolving a promise as necessary.
   */
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

  /**
   * Update all currently downloding resource's state's by calling download() with 
   * their ID.
   */
  async updateAll() {
    const requests = await this.db.requests.find({
      "torrent.status.inProgress": true,
    }).toArray();
    
    await Promise.all(requests.map(async (request) => {
      await this.download(request._id);
    }));
  }

  /**
   * Evaluates a resource's state and transitions to other states if needed.
   * Implements the state machine described in the class's documentation comment.
   * @param requestId The ID of the resource request.
   */
  async download(requestId) {
    // Get request
    const request = await this.db.requests.findOne({
      _id: requestId,
    });

    if (request === null || request.discord.statusMsgId === undefined || request.discord.statusMsgId === null) {
      // Couldn't find request, or no status message has been sent yet
      return;
    }

    // Get status msg
    const channel = await this.discord.channels.fetch(request.discord.channelId);
    const msg = await channel.messages.fetch(request.discord.statusMsgId);

    // Get torrent information
    let transmissionId = undefined;
    if (request.torrent === undefined || request.torrent.transmissionId === undefined) {
      // If we haven't 
      const handle = await this._promisify((cb) => {
        this.transmission.addUrl(request.choice.magnetLink, cb);
      });

      transmissionId = handle.id;
    } else {
      transmissionId = request.torrent.transmissionId;
    }

    const status = (await this._promisify((cb) => {
      this.transmission.get(transmissionId, cb);
    })).torrents[0];

    // Save torrent status info in db
    let torrStatus = ":thinking: Verifying...";

    if (status === undefined) {
      this.log.warn("Can't find torrent for request, will remove request from database", {
        request_id: request._id,
        transmission_id: transmissionId,
        name: request.choice.name,
        magentUrl: request.choice.magnetUrl,
      });
      await this.db.requests.deleteOne({ _id: request._id });
      return;
    }
    
    switch (status.status) {
      // Got these numbers by googling, there doesn't seem to be any real docs for these
    case 3:
      torrStatus = "Queued";
      break
    case 4:
      torrStatus = "Downloading";
      break;
    case 6:
      torrStatus = "Seeding";
      break;
    default:
      this.log.warn("Encountered unknown resource dowload status", {
        request_id: request._id,
        status: status.status,
      });
      break;
    }
    
    const dbTorr = {
      transmissionId: transmissionId,
      name: status.name,
      hashString: status.hashString,
      status: {
        inProgress: torrStatus !== "Seeding",
        status: torrStatus,
        progress: status.percentDone,
        downloadRate: status.rateDownload,
        numPeers: status.peersSendingToUs,
        eta: status.eta,
      },
    };
    
    await this.db.requests.updateOne({
      _id: requestId,
    }, {
      $set: {
        torrent: dbTorr,
      }
    });

    // Update discord status message
    const msgFields = [
      {
        name: "Status",
        value: dbTorr.status.status,
      },
    ];

    if (dbTorr.status.status === "Downloading") {
      msgFields.push({
        name: "Progress",
        value: `${roundTo(dbTorr.status.progress * 100, 2)}%`,
      });
      
      msgFields.push({
        name: "Download Rate",
        value: `${roundTo(dbTorr.status.downloadRate / 10000, 2)} MB/s`,
      });

      msgFields.push({
        name: "# Peers",
        value: `${dbTorr.status.numPeers} / ${request.choice.seeders}`,
      });

      const eta = new Date(0);
      eta.setSeconds(dbTorr.status.eta);
      
      msgFields.push({
        name: "ETA",
        value: eta.toISOString().substr(11, 8),
      });
    }

    msg.edit({
      embed: {
        title: `🌾 ${request.choice.name}`,
        fields: msgFields.map((field) => {
          return {
            ...field,
            inline: true,
          };
        }),
        hexColor: COLORS.PRIMARY_HEX,
      },
    });

    // If newly completed ping user
    if (request.torrent.status.inProgress === false && dbTorr.status.inProgress === true) {
      const reqUser = await channel.users.fetch(request.discord.authorId);
      await channel.send(`${reqUser.toString()} ${request.choice.name} is done.`);
    }
  }
}

module.exports = ResourceFetcher;
