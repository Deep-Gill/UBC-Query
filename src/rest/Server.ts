/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");
import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError
} from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;
    private static insightFacade: InsightFacade = new InsightFacade();

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");

                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // This is an example endpoint that you can invoke by accessing this URL in your browser:
                // http://localhost:4321/echo/hello
                that.rest.get("/echo/:msg", Server.echo);

                // NOTE: your endpoints should go here
                that.rest.put("/dataset/:id/:kind", Server.putDataset);
                that.rest.del("/dataset/:id", Server.deleteDataset);
                that.rest.post("/query", Server.postQuery);
                that.rest.get("/datasets", Server.getDatasets);

                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);

                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });
                Server.retrieveLostData();
            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.
    private static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + 200);
            res.json(200, {result: response});
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.json(400, {error: err});
        }
        return next();
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }

    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

    private static putDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::putDataset(..) - params: " + "id: " + req.params.id + " kind: " + req.params.kind);
        try {
            const id: string = req.params.id;
            let kind: InsightDatasetKind;
            if (req.params.kind === "courses") {
                kind = InsightDatasetKind.Courses;
            } else {
                kind = InsightDatasetKind.Rooms;
            }
            const content: string = new Buffer(req.body).toString("base64");
            return Server.insightFacade.addDataset(id, content, kind).then((response) => {
                Log.info("Server::putDataset(..) - responding " + 200);
                res.json(200, {result: response});
                return next();
            }).catch((err) => {
                Log.error("Server::putDataset(..) - responding 400");
                res.json(400, {error: err.message});
                return next();
            });
        } catch (err) {
            Log.error("Server::putDataset(..) - responding 400");
            res.json(400, {error: err.message});
            return next();
        }
    }

    private static deleteDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::deleteDataset(..) - params: " + "id: " + req.params.id);
        try {
            const id: string = req.params.id;
            return Server.insightFacade.removeDataset(id).then((response) => {
                Log.info("Server::deleteDataset(..) - responding " + 200);
                res.json(200, {result: response});
                return next();
            }).catch((err) => {
                if (err instanceof InsightError) {
                    Log.error("Server::deleteDataset(..) - responding 400");
                    res.json(400, {error: err.message});
                    return next();
                }
                if (err instanceof NotFoundError) {
                    Log.error("Server::deleteDataset(..) - responding 404");
                    res.json(404, {error: err.message});
                    return next();
                }
            });
        } catch (err) {
            Log.error("Server::deleteDataset(..) - responding 400");
            res.json(400, {error: err.message});
            return next();
        }
    }

    // Suppose the server crashes between PUT and DEL, thus the once added dataset to memory is lost. Thus we return
    // an error when we should be returning the id of the dataset. Thus it makes zero sense to check into storage to
    // potentially retrieve a once lost dataset from disk only in performQuery. It will be far more robust and better if
    // whenever the Server starts, we go into the storage and add all datasets from there to memory straight away.

    private static postQuery(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::postQuery(..) - params: " + "query: " + JSON.stringify(req.body));
        try {
            const query: any = req.body;
            return Server.insightFacade.performQuery(query).then((response) => {
                Log.info("Server::postQuery(..) - responding " + 200);
                res.json(200, {result: response});
                return next();
            }).catch((err) => {
                Log.error("Server::postQuery(..) - responding 400");
                res.json(400, {error: err.message});
                return next();
            });
        } catch (err) {
            Log.error("Server::postQuery(..) - responding 400");
            res.json(400, {error: err.message});
            return next();
        }
    }

    private static getDatasets(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::getDatasets(..)");
        try {
            return Server.insightFacade.listDatasets().then((response) => {
                Log.info("Server::getDatasets(..) - responding " + 200);
                res.json(200, {result: response});
                return next();
            }).catch((err) => {
                Log.error("Server::getDatasets(..) - responding 400");
                res.json(400, {error: err.message});
                return next();
            });
        } catch (err) {
            Log.error("Server::getDatasets(..) - responding 400");
            res.json(400, {error: err.message});
            return next();
        }
    }

    private static retrieveLostData() {
        let data: any[] = [];
        let content: string = "";
        if (fs.existsSync("./storage")) {
            return fs.readdirSync("./storage").forEach(function (relativePath: string) {
                if (relativePath !== ".DS_Store") {
                    const kind: string = relativePath.split("_")[0];
                    const id: string = relativePath.split("_")[1];
                    content = fs.readFileSync("./storage/" + relativePath, "utf8");
                    data = JSON.parse(content);
                    if (kind ===  "courses") {
                        const newHeader: InsightDataset = {id: id, kind: InsightDatasetKind.Courses,
                                                           numRows: data.length};
                        Server.insightFacade.datasets.set(id, {header: newHeader, content: data});
                    } else if (kind === "rooms") {
                        const newHeader: InsightDataset = {id: id, kind: InsightDatasetKind.Rooms,
                                                           numRows: data.length};
                        Server.insightFacade.datasets.set(id, {header: newHeader, content: data});
                    }
                }
            });
        } else {
            fs.mkdirSync("./storage");
        }
    }

}
