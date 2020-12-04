// https://stackoverflow.com/a/50363693
import tsSrcMap from "source-map-support";
tsSrcMap.install();

import { URL } from "url";

import express from "express";
import EnvConfig from "./envconfig";
import AsyncTransmission from "./transmission";

/**
 * Defines an API route's parameters. The reason we have a little wrapper systema around
 * this is so that we can wrap the APIRoute[2] (APIHandler) function call in some logic
 * to catch reject promises.
 */
type APIRoute = [string, string, APIHandler];

/**
 * HTTP API handler. For Express.
 */
type APIHandler =  (req: express.Request, res: express.Response) => Promise<any>;

/**
 * Application configuration.
 */
interface Config {
    /**
     * HTTP configuration.
     */
    http: {
        /**
         * Port to listen.
         */
        port: number,
    },

    /**
     * Torrent configuration.
     */
    torrent: {
        /**
         * Transmission daemon RPC host.
         */
        transmissionHost: string,

        /**
         * Download directory. The Transmission Daemon must have access to this directory.
         */
        downloadDir: string,

        /**
         * Maximum number of bytes which can be used to store torrent files in the
         * download directory.
         */
        downloadMaxBytes: number,
    },
}

/**
 * What state in the download process a resource is in currently.
 */
enum DownloadState {
    /**
     * The download has not been queued because the server is still determining if the
     * resource can be downloaded.
     */
    Verifying,
    
    /**
     * The download is queued.
     */
    Queued,

    /**
     * The download is in progress.
     */
    InProgress,

    /**
     * The download is completed.
     */
    Completed,
}

/**
 * Resource download status.
 */
interface DownloadStatus {
    /**
     * State of download.
     */
    state: DownloadState,

    /**
     * Message associated with the state, should be a sentence used to explain
     * the situation.
     */
    message: string,
}

/**
 * Downloads a resource.
 */
interface Downloader {
    /**
     * Checks if a URI protocol is supported by this downloader.
     * @param protocol Procotol to check. Will be in the format "protocolName:". Notice
     *     The colon at the end.
     * @returns True if supported, false if not.
     */
    supported(protocol: string): boolean;

    /**
     * Provides the status of the download. This method is expected to be called at any
     * time during the download process to get the status of a download. The Downloader
     * must be intelligent and know if something is new or not.
     * @param uri Identifier of resource.
     * @returns Status.
     */
    download(uri: string): Promise<DownloadStatus>;
}

/**
 * Download directory specification.
 */
interface DownloadDir {
    /**
     * Path to directory.
     */
    path: string,

    /**
     * Maximum number of bytes which can be used.
     */
    maxBytes: number,
}

/**
 * Implements the Downloader interface for a torrent.
 */
class TorrentDownloader implements Downloader {
    /**
     * Transmission torrent RPC client.
     */
    transmission: AsyncTransmission;

    /**
     * Download directory.
     */
    downloadDir: DownloadDir;

    /**
     * Initializers a torrent downloader.
     * @param transmission Transmission torrent RPC client.
     */
    constructor(transmission: AsyncTransmission, downloadDir: DownloadDir) {
        this.transmission = transmission;
        this.downloadDir = downloadDir;
    }
    
    /**
     * Determines if the protocol is a supported Torrent format.
     * @param protocol Procotol to check. Will be in the format "protocolName:". Notice
     *     The colon at the end.
     * @returns True if supported.
     */
    supported(protocol: string): boolean {
        return protocol === "magnet:";
    }

    /**
     * Get the status of a torrent download.
     * @returns Status.
     */
    async download(uri: string): Promise<DownloadStatus> {
        const resp = await this.transmission.addUrl(uri);
        console.log("TorrentDownloader.download: resp=", resp);
        
        return {
            state: DownloadState.Verifying,
            message: "This endpoint has not been implemented yet",
        };
    }
}

/**
 * Class which provides the HTTP API implementation. The reason it's a class is to make 
 * it easier to test later.
 *
 * To use:
 * ```ts
 * const api = new HTTPAPI();
 * await api.run(): // Run the HTTP server, closes cleanly on SIGINT (C-c).
 * ```
 */
export default class HTTPAPI {
    /**
     * Properly configured Express server.
     */
    app: express.Express;

    /**
     * HTTP API routes.
     */
    routes: APIRoute[];
    
    /**
     * Resource downloaders.
     */
    downloaders: Downloader[];

    /**
     * Application configuration.
     */
    cfg: Config;
    
    /**
     * Initialize an HTTP API, does not run anything.
     */
    constructor() {
        // Get configuration
        this.cfg = EnvConfig("APP_", {
            http: {
                port: ["HTTP_PORT", "string"],
            },
            torrent: {
                transmissionHost: ["TRANSMISSION_HOST", "string"],
                downloadDir: ["TORRENT_DOWNLOAD_DIR", "string"],
                downloadMaxBytes: ["TORRENT_DOWNLOAD_MAX_BYTES", "integer"],
            },
        }) as Config;
        
        // Setup express
        this.app = express();

        this.app.use(this.loggerHandler);

        this.routes = [
            ["get", "/api/v0/health", this.getHealth],
            ["get", "/api/v0/resource/:uri", this.getResource],
        ];
        this.routes.forEach((route) => {
            console.log(`Registered [${route[0]}, ${route[1]}]`);
            let routeFn = null;
            if (route[0] === "get") {
                routeFn = this.app.get.bind(this.app);
            } else if (route[0] === "post") {
                routeFn = this.app.post.bind(this.app);
            } else if (route[0] === "put") {
                routeFn = this.app.put.bind(this.app);
            } else if (route[0] === "delete") {
                routeFn = this.app.delete.bind(this.app);
            } else if (route[0] === "options") {
                routeFn = this.app.options.bind(this.app);
            }

            if (routeFn === null) {
                throw `Invalid route, invalid request type for: ${route}`;
            }

            routeFn(route[1], (req: express.Request, res: express.Response) => {
                Promise.all([route[2].bind(this)(req, res)]).catch((e: any) => {
                    throw e;
                });
            });
        });

        this.app.use(this.defaultHandler); // Should be after all defined routes
        this.app.use(this.errorHandler); // Last

        // Setup downloaders
        this.downloaders = [
            new TorrentDownloader(new AsyncTransmission({
                host: this.cfg.torrent.transmissionHost,
            }), {
                path: this.cfg.torrent.downloadDir,
                maxBytes: this.cfg.torrent.downloadMaxBytes,
            }),
        ];
                
/*
        // Mongo DB
        const dbConn = await mongodb.MongoClient.connect(cfg.mongodb.uri, {
	    useUnifiedTopology: true
        });
        const dbClient = await dbConn.db(cfg.mongodb.dbName);

        const db = {
	    users: await dbClient.collection("users"),
	    playlists: await dbClient.collection("playlists"),
	    tracks: await dbClient.collection("tracks"),
        };

        console.log("Connected to MongoDB");
        */        
    }

    /**
     * Run the HTTP API and gracefully stop blocking the process via SIGINT.  
     * @returns Promise which resolves null when exiting or rejects with a string error. 
     */
    async run(): Promise<string | null> {
        console.log("API server starting");

        // Execute server
        return new Promise((resolve, reject) => {
	        const server = this.app.listen(this.cfg.http.port, () => {
		        console.log(`HTTP API listening on :${this.cfg.http.port}`);
	        });

	        process.on("SIGINT", async () => {
		        console.log("Shutting down");
		        server.close();
		        // await dbConn.close();
	        });
	        
	        server.on("error", (e) => {
		        reject(e.toString());
	        });

	        server.on("close", () => {
		        resolve(null);
	        });
        });
    }

    /**
     * Handles any requests that don't have a handler.
     * Request: ANY
     * Response: 404 `{ error: "not found" }`
     */
    async defaultHandler(req: express.Request, res: express.Response, next: express.NextFunction) {
        return res.status(404).send({
            "error": "not found",
        });
    }
    
    /**
     * Handles any errors in other handlers.
     * Response: `{ error: "internal server error" }`
     */
    async errorHandler(error: any, req: express.Request, res: express.Response, next: express.NextFunction) {
        console.trace(`${req.method} ${req.path}`, error);
        
        return res.send({
            error: "internal server error",
        });
    }

    /**
     * Middleware which logs a request and calls the next handler.
     */
    loggerHandler(req: express.Request, res: express.Response, next: express.NextFunction) {
        console.log(`${new Date().toISOString()} REQ ${req.method} ${req.path}`);

        next();

        console.log(`${new Date().toISOString()} RES ${req.method} ${req.path} ${res.statusCode}`);
    }

    /**
     * Get API health. Simple liveness check.
     * Request: GET
     * Response: `{ ok: true }`
     */
    async getHealth(req: express.Request, res: express.Response): Promise<any> {
        return res.send({
            ok: true,
        });
    }

    /**
     * Get resource. If downloaded returns status, if not downloaded starts download,
     * if currently downloading returns status.
     * Request: GET
     * URL Parameters:
     *     <uri> The resource's URI. Must be a supported schema.
     * Response: { "status": DownloadStatus }
     */
    async getResource(req: express.Request, res: express.Response): Promise<any> {
        // Parse URI
        const uri = new URL(req.params.uri);
        
        // Find supported downloader
        let downloader: Downloader | null = null;

        for (let i = 0; i < this.downloaders.length; i++) {
            const d = this.downloaders[i];
            if (d.supported(uri.protocol) === true) {
                downloader = d;
                break;
            }
        }
        if (downloader === null) {
            return res.status(400).send({
                error: `no downloaders available for protocol: ${uri.protocol}`,
            });
        }

        // Get download status
        const status = await downloader.download(uri.toString());

        return res.send({
            status: status,
        });
    }
}
