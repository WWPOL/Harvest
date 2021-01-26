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
