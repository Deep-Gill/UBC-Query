"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const restify = require("restify");
const Util_1 = require("../Util");
const IInsightFacade_1 = require("../controller/IInsightFacade");
const InsightFacade_1 = require("../controller/InsightFacade");
class Server {
    constructor(port) {
        Util_1.default.info("Server::<init>( " + port + " )");
        this.port = port;
    }
    stop() {
        Util_1.default.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }
    start() {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Util_1.default.info("Server::start() - start");
                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({ mapFiles: true, mapParams: true }));
                that.rest.use(function crossOrigin(req, res, next) {
                    res.header("Access-Control-Allow-Origin", "*");
                    res.header("Access-Control-Allow-Headers", "X-Requested-With");
                    return next();
                });
                that.rest.get("/echo/:msg", Server.echo);
                that.rest.put("/dataset/:id/:kind", Server.putDataset);
                that.rest.del("/dataset/:id", Server.deleteDataset);
                that.rest.post("/query", Server.postQuery);
                that.rest.get("/datasets", Server.getDatasets);
                that.rest.get("/.*", Server.getStatic);
                that.rest.listen(that.port, function () {
                    Util_1.default.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });
                that.rest.on("error", function (err) {
                    Util_1.default.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });
                Server.retrieveLostData();
            }
            catch (err) {
                Util_1.default.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }
    static echo(req, res, next) {
        Util_1.default.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Util_1.default.info("Server::echo(..) - responding " + 200);
            res.json(200, { result: response });
        }
        catch (err) {
            Util_1.default.error("Server::echo(..) - responding 400");
            res.json(400, { error: err });
        }
        return next();
    }
    static performEcho(msg) {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        }
        else {
            return "Message not provided";
        }
    }
    static getStatic(req, res, next) {
        const publicDir = "frontend/public/";
        Util_1.default.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err, file) {
            if (err) {
                res.send(500);
                Util_1.default.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }
    static putDataset(req, res, next) {
        Util_1.default.trace("Server::putDataset(..) - params: " + "id: " + req.params.id + " kind: " + req.params.kind);
        try {
            const id = req.params.id;
            let kind;
            if (req.params.kind === "courses") {
                kind = IInsightFacade_1.InsightDatasetKind.Courses;
            }
            else {
                kind = IInsightFacade_1.InsightDatasetKind.Rooms;
            }
            const content = new Buffer(req.body).toString("base64");
            return Server.insightFacade.addDataset(id, content, kind).then((response) => {
                Util_1.default.info("Server::putDataset(..) - responding " + 200);
                res.json(200, { result: response });
                return next();
            }).catch((err) => {
                Util_1.default.error("Server::putDataset(..) - responding 400");
                res.json(400, { error: err.message });
                return next();
            });
        }
        catch (err) {
            Util_1.default.error("Server::putDataset(..) - responding 400");
            res.json(400, { error: err.message });
            return next();
        }
    }
    static deleteDataset(req, res, next) {
        Util_1.default.trace("Server::deleteDataset(..) - params: " + "id: " + req.params.id);
        try {
            const id = req.params.id;
            return Server.insightFacade.removeDataset(id).then((response) => {
                Util_1.default.info("Server::deleteDataset(..) - responding " + 200);
                res.json(200, { result: response });
                return next();
            }).catch((err) => {
                if (err instanceof IInsightFacade_1.InsightError) {
                    Util_1.default.error("Server::deleteDataset(..) - responding 400");
                    res.json(400, { error: err.message });
                    return next();
                }
                if (err instanceof IInsightFacade_1.NotFoundError) {
                    Util_1.default.error("Server::deleteDataset(..) - responding 404");
                    res.json(404, { error: err.message });
                    return next();
                }
            });
        }
        catch (err) {
            Util_1.default.error("Server::deleteDataset(..) - responding 400");
            res.json(400, { error: err.message });
            return next();
        }
    }
    static postQuery(req, res, next) {
        Util_1.default.trace("Server::postQuery(..) - params: " + "query: " + JSON.stringify(req.body));
        try {
            const query = req.body;
            return Server.insightFacade.performQuery(query).then((response) => {
                Util_1.default.info("Server::postQuery(..) - responding " + 200);
                res.json(200, { result: response });
                return next();
            }).catch((err) => {
                Util_1.default.error("Server::postQuery(..) - responding 400");
                res.json(400, { error: err.message });
                return next();
            });
        }
        catch (err) {
            Util_1.default.error("Server::postQuery(..) - responding 400");
            res.json(400, { error: err.message });
            return next();
        }
    }
    static getDatasets(req, res, next) {
        Util_1.default.trace("Server::getDatasets(..)");
        try {
            return Server.insightFacade.listDatasets().then((response) => {
                Util_1.default.info("Server::getDatasets(..) - responding " + 200);
                res.json(200, { result: response });
                return next();
            }).catch((err) => {
                Util_1.default.error("Server::getDatasets(..) - responding 400");
                res.json(400, { error: err.message });
                return next();
            });
        }
        catch (err) {
            Util_1.default.error("Server::getDatasets(..) - responding 400");
            res.json(400, { error: err.message });
            return next();
        }
    }
    static retrieveLostData() {
        let data = [];
        let content = "";
        if (fs.existsSync("./storage")) {
            return fs.readdirSync("./storage").forEach(function (relativePath) {
                if (relativePath !== ".DS_Store") {
                    const kind = relativePath.split("_")[0];
                    const id = relativePath.split("_")[1];
                    content = fs.readFileSync("./storage/" + relativePath, "utf8");
                    data = JSON.parse(content);
                    if (kind === "courses") {
                        const newHeader = { id: id, kind: IInsightFacade_1.InsightDatasetKind.Courses,
                            numRows: data.length };
                        Server.insightFacade.datasets.set(id, { header: newHeader, content: data });
                    }
                    else if (kind === "rooms") {
                        const newHeader = { id: id, kind: IInsightFacade_1.InsightDatasetKind.Rooms,
                            numRows: data.length };
                        Server.insightFacade.datasets.set(id, { header: newHeader, content: data });
                    }
                }
            });
        }
        else {
            fs.mkdirSync("./storage");
        }
    }
}
exports.default = Server;
Server.insightFacade = new InsightFacade_1.default();
//# sourceMappingURL=Server.js.map