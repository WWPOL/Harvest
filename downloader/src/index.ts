import express from "express";
import EnvConfig from "./envconfig";

type APIRoute = [string, string, APIHandler];

type APIHandler =  (req: express.Request, res: express.Response) => Promise<any>;

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
     * Initialize an HTTP API, does not run anything.
     */
    constructor() {
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
                routeFn = this.app.get;
            } else if (route[0] === "post") {
                routeFn = this.app.post;
            } else if (route[0] === "put") {
                routeFn = this.app.put;
            } else if (route[0] === "delete") {
                routeFn = this.app.delete;
            } else if (route[0] === "options") {
                routeFn = this.app.options;
            }

            if (routeFn === null) {
                throw `Invalid route, invalid request type for: ${route}`;
            }

            routeFn(route[1], (req: express.Request, res: express.Response) => {
                Promise.all([route[2](req, res)]).catch((e: any) => {
                    throw e;
                });
            });
        });

        this.app.use(this.defaultHandler); // Should be after all defined routes
        this.app.use(this.errorHandler); // Last
    }

    /**
     * Run the HTTP API and gracefully stop blocking the process via SIGINT.  
     * @returns Promise which resolves null when exiting or rejects with a string error. 
     */
    async run(): Promise<string | null> {
        // Get configuration
        const cfg = EnvConfig("APP_", {
            http: {
                port: ["HTTP_PORT", "string"],
            },
        });

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

        // Execute server
        return new Promise((resolve, reject) => {
	        const server = this.app.listen(cfg.http.port, () => {
		        console.log(`HTTP API listening on :${cfg.http.port}`);
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
     * Response: { "resource": Resource }
     */
    async getResource(req: express.Request, res: express.Response): Promise<any> {
        throw "Not implemented";
    }
}
