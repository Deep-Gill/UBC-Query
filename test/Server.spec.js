"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Server_1 = require("../../../Desktop/project_team192/src/rest/Server");
const InsightFacade_1 = require("../../../Desktop/project_team192/src/controller/InsightFacade");
const chai = require("chai");
const chaiHttp = require("chai-http");
const chai_1 = require("chai");
const Util_1 = require("../../../Desktop/project_team192/src/Util");
describe("Facade D3", function () {
    let facade = null;
    let server = null;
    let serverURL = "http://localhost:4321";
    let fs = require("fs");
    let validQuery = {
        WHERE: {},
        OPTIONS: {
            COLUMNS: [
                "courses_id",
                "overallAvg"
            ],
            ORDER: {
                dir: "UP",
                keys: [
                    "courses_id"
                ]
            }
        },
        TRANSFORMATIONS: {
            GROUP: [
                "courses_id"
            ],
            APPLY: [
                {
                    overallAvg: {
                        AVG: "courses_avg"
                    }
                }
            ]
        }
    };
    let validQuery2 = {
        WHERE: {},
        OPTIONS: {
            COLUMNS: [
                "coursesCPSC_id",
                "overallAvg"
            ],
            ORDER: {
                dir: "UP",
                keys: [
                    "coursesCPSC_id"
                ]
            }
        },
        TRANSFORMATIONS: {
            GROUP: [
                "coursesCPSC_id"
            ],
            APPLY: [
                {
                    overallAvg: {
                        AVG: "coursesCPSC_avg"
                    }
                }
            ]
        }
    };
    let invalidQuery = {
        WHERE: {
            AND: [
                {
                    IS: {
                        coursesCPSC_dept: "m*"
                    }
                },
                {
                    IS: {
                        coursesCPSC_id: "3*"
                    }
                }
            ]
        },
        OPTIONS: {
            COLUMNS: [
                "coursesCPSC_dept",
                "coursesCPSC_id"
            ],
            ORDER: {
                dir: "UP",
                keys: [
                    "coursesCPSC_dept",
                    "coursesCPSC_id"
                ]
            }
        },
        TRANSFORMATIONS: {
            GROUP: [
                "coursesCPSC_id",
                "coursesCPSC_dept",
                "coursesCPSC_title",
                "coursesCPSC_instructor"
            ]
        }
    };
    let invalidQuery2 = {
        WHERE: {
            AND: [
                {
                    IS: {
                        courses_dept: "m*"
                    }
                },
                {
                    IS: {
                        courses_id: "3*"
                    }
                }
            ]
        },
        OPTIONS: {
            COLUMNS: [
                "courses_dept",
                "courses_id"
            ],
            ORDER: {
                dir: "UP",
                keys: [
                    "courses_dept",
                    "courses_id"
                ]
            }
        },
        TRANSFORMATIONS: {
            GROUP: [
                "courses_id",
                "courses_dept",
                "courses_title",
                "courses_instructor"
            ]
        }
    };
    chai.use(chaiHttp);
    before(function () {
        facade = new InsightFacade_1.default();
        server = new Server_1.default(4321);
        try {
            server.start();
        }
        catch (err) {
            Util_1.default.error("Server returned an error when starting, " + err.message);
        }
    });
    after(function () {
        server.stop();
    });
    beforeEach(function () {
        const file = "./test/data/courses.zip";
        if (!fs.existsSync("./storage/courses_courses")) {
            chai.request(serverURL)
                .put("/dataset/courses/courses")
                .send(fs.readFileSync(file))
                .set("Content-Type", "application/x-zip-compressed")
                .then((response) => {
                Util_1.default.trace("added file courses_courses in ./storage directory");
            }).catch((err) => {
                Util_1.default.error("PUT returned an error with the message: " + err.response.body.error);
            });
        }
        return fs.readdirSync("./storage").forEach(function (relativePath) {
            if (relativePath !== "courses_courses" && relativePath !== ".DS_Store") {
                if (fs.existsSync("./storage/" + relativePath)) {
                    const id = relativePath.split("_")[1];
                    const url = "/dataset/" + id;
                    return chai.request(serverURL).del(url).then((response) => {
                        Util_1.default.trace("deleting file: " + relativePath + " in ./storage directory");
                    }).catch((err) => {
                        Util_1.default.error("DEL returned an error with the message: " + err.response.body.error);
                    });
                }
            }
        });
    });
    afterEach(function () {
        return fs.readdirSync("./storage").forEach(function (relativePath) {
            if (relativePath !== "courses_courses" && relativePath !== ".DS_Store") {
                if (fs.existsSync("./storage/" + relativePath)) {
                    const id = relativePath.split("_")[1];
                    const url = "/dataset/" + id;
                    return chai.request(serverURL).del(url).then((response) => {
                        Util_1.default.trace("deleting file: " + relativePath + " in ./storage directory");
                    }).catch((err) => {
                        Util_1.default.error("DEL returned an error with the message: " + err.response.body.error);
                    });
                }
            }
        });
    });
    it("GET test, retrieves a list of added datasets from disk and memory", function () {
        try {
            const file = "./test/data/coursesCPSC.zip";
            return chai.request(serverURL)
                .put("/dataset/coursesCPSC/courses")
                .send(fs.readFileSync(file))
                .set("Content-Type", "application/x-zip-compressed")
                .then((response) => {
                Util_1.default.trace("GET test added the dataset properly");
                chai_1.expect(response.body.result).to.have.deep.members(["courses", "coursesCPSC"]);
                return chai_1.expect(response.status).to.be.equal(200);
            }).then(() => {
                return chai.request(serverURL)
                    .get("/datasets")
                    .then((response) => {
                    Util_1.default.trace("GET test returned the required result");
                    chai_1.expect(response.status).to.be.equal(200);
                    chai_1.expect(response.body.result).to.have.deep.members([
                        { id: "courses", kind: "courses", numRows: 64612 },
                        { id: "coursesCPSC", kind: "courses", numRows: 248 }
                    ]);
                }).catch((err) => {
                    Util_1.default.error("GET test returned an error with the message: " + err.response.body.error);
                    chai_1.expect.fail();
                });
            }).catch((err) => {
                Util_1.default.error("GET returned an error with the message: " + err.response.body.error);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.error("GET test returned an error with the message: " + err.message);
            chai_1.expect.fail();
        }
    });
    it("GET test, retrieves a list of added datasets from disk", function () {
        try {
            return chai.request(serverURL)
                .get("/datasets")
                .then((response) => {
                Util_1.default.trace("GET test returned the required result");
                chai_1.expect(response.status).to.be.equal(200);
                chai_1.expect(response.body.result).to.have.deep.members([{ id: "courses", kind: "courses", numRows: 64612 }]);
            }).catch((err) => {
                Util_1.default.error("GET test returned an error with the message: " + err.response.body.error);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.error("GET test returned an error with the message: " + err.message);
            chai_1.expect.fail();
        }
    });
    it("POST test,returns error because invalid query on dataset not stored in memory", function () {
        const dataset = "./test/data/courses.zip";
        this.timeout(35000);
        try {
            return chai.request(serverURL)
                .post("/query")
                .send(invalidQuery2)
                .then((response) => {
                Util_1.default.error("POST perfomed the query when it shouldn't have.");
                chai_1.expect.fail();
            }).catch((err) => {
                Util_1.default.trace("POST returned an error with the message: " + err.response.body.error);
                chai_1.expect(err.response.status).to.be.equal(400);
            });
        }
        catch (err) {
            Util_1.default.error("POST returned an error");
            chai_1.expect.fail();
        }
    });
    it("POST test, returns an error because of an invalid query", function () {
        const dataset = "./test/data/coursesCPSC.zip";
        this.timeout(35000);
        try {
            return chai.request(serverURL)
                .put("/dataset/coursesCPSC/courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then((response) => {
                Util_1.default.trace("PUT added the dataset properly");
                return chai_1.expect(response.status).to.be.equal(200);
            }).then(() => {
                return chai.request(serverURL)
                    .post("/query")
                    .send(invalidQuery)
                    .then((response) => {
                    Util_1.default.error("POST perfomed the query when it shouldn't have.");
                    chai_1.expect.fail();
                }).catch((err) => {
                    Util_1.default.trace("POST returned an error with the message: " + err.response.body.error);
                    chai_1.expect(err.response.status).to.be.equal(400);
                });
            }).catch((err) => {
                Util_1.default.error("POST returned an error with the message: " + err.response.body.error);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.error("POST returned an error");
            chai_1.expect.fail();
        }
    });
    it("POST test, performs a valid query when dataset is stored in memory", function () {
        const dataset = "./test/data/coursesCPSC.zip";
        this.timeout(35000);
        try {
            return chai.request(serverURL)
                .put("/dataset/coursesCPSC/courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then((response) => {
                Util_1.default.trace("PUT added the dataset properly");
                return chai_1.expect(response.status).to.be.equal(200);
            }).then(() => {
                return chai.request(serverURL)
                    .post("/query")
                    .send(validQuery2)
                    .then((response) => {
                    Util_1.default.trace("POST perfomed the query adequately.");
                    return chai_1.expect(response.status).to.be.equal(200);
                }).catch((err) => {
                    Util_1.default.error("POST returned an error with the message: " + err.response.body.error);
                    chai_1.expect.fail();
                });
            }).catch((err) => {
                Util_1.default.error("POST returned an error with the message: " + err.response.body.error);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.error("POST returned an error");
            chai_1.expect.fail();
        }
    });
    it("POST test, performs a valid query when dataset is not stored in memory", function () {
        const dataset = "./test/data/courses.zip";
        this.timeout(35000);
        try {
            return chai.request(serverURL)
                .post("/query")
                .send(validQuery)
                .then((response) => {
                Util_1.default.trace("POST returned the appropriate result when accessing dataset stored on disk.");
                chai_1.expect(response.status).to.be.equal(200);
            }).catch((err) => {
                Util_1.default.error("POST returned an error with the message: " + err.response.body.error);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.error("POST returned an error");
            chai_1.expect.fail();
        }
    });
    it("DEL test,removes a valid dataset that has not been added and with invalid id", function () {
        try {
            return chai.request(serverURL)
                .del("/dataset/courses_CPSC")
                .then(function (res) {
                Util_1.default.trace("PUT request was a fulfilled when it shouldn't have");
                chai_1.expect.fail();
            }).catch((err) => {
                Util_1.default.error("DEL test returned an error with message: " + err.response.body.error);
                return chai_1.expect(err.response.status).to.be.equal(400);
            });
        }
        catch (err) {
            Util_1.default.error("DEL test returned an error with message: " + err.message);
            chai_1.expect.fail();
        }
    });
    it("DEL test, removes a valid dataset that has not been added", function () {
        try {
            return chai.request(serverURL)
                .del("/dataset/coursesCPSC")
                .then(function (res) {
                Util_1.default.trace("PUT request was a fulfilled when it shouldn't have");
                chai_1.expect.fail();
            }).catch((err) => {
                Util_1.default.error("DEL test returned an error with message: " + err.response.body.error);
                return chai_1.expect(err.response.status).to.be.equal(404);
            });
        }
        catch (err) {
            Util_1.default.error("DEL test returned an error with message: " + err.message);
            chai_1.expect.fail();
        }
    });
    it("DEL test, removes a valid dataset that has been added", function () {
        try {
            const dataset = "./test/data/courses.zip";
            return chai.request(serverURL)
                .put("/dataset/coursesCPSC/courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res) {
                Util_1.default.trace("PUT request was a fulfilled and returned the proper result");
                return chai_1.expect(res.status).to.be.equal(200);
            }).then(function () {
                return chai.request(serverURL).del("/dataset/coursesCPSC").then(function (res) {
                    chai_1.expect(res.body.result).to.deep.equal("coursesCPSC");
                    return chai_1.expect(res.status).to.be.equal(200);
                });
            }).catch((err) => {
                Util_1.default.error("DEL test returned an error with message: " + err.message);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.error("DEL test returned an error with message: " + err.message);
            chai_1.expect.fail();
        }
    });
    it("PUT test, adds dataset from file that does not exist", function () {
        try {
            const dataset = "./test/data/noFile.zip";
            return chai.request(serverURL)
                .put("/dataset/coursesCPSC/courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res) {
                Util_1.default.trace("PUT request was fulfilled when it shouldn't have.");
                chai_1.expect.fail();
            })
                .catch(function (err) {
                Util_1.default.trace("PUT request was a rejected with the message: " + err.response.body.error);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.error("PUT request was a rejected like it should have");
        }
    });
    it("PUT test for courses dataset, rejects a dataset because of invalid id (   )", function () {
        try {
            const dataset = "./test/data/courses.zip";
            return chai.request(serverURL)
                .put("/dataset/       /courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res) {
                Util_1.default.trace("PUT request was fulfilled when it shouldn't have.");
                chai_1.expect.fail();
            })
                .catch(function (err) {
                Util_1.default.trace("PUT request was a rejected with the message: " + err.response.body.error);
                chai_1.expect(err.response.status).to.be.equal(400);
            });
        }
        catch (err) {
            Util_1.default.error("PUT request was a rejected");
            chai_1.expect.fail();
        }
    });
    it("PUT test for courses dataset, rejects a dataset because of invalid id (_)", function () {
        try {
            const dataset = "./test/data/courses.zip";
            return chai.request(serverURL)
                .put("/dataset/courses_CPSC/courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res) {
                Util_1.default.trace("PUT request was fulfilled when it shouldn't have.");
                chai_1.expect.fail();
            })
                .catch(function (err) {
                Util_1.default.trace("PUT request was a rejected with the message: " + err.response.body.error);
                chai_1.expect(err.response.status).to.be.equal(400);
            });
        }
        catch (err) {
            Util_1.default.error("PUT request was a rejected");
            chai_1.expect.fail();
        }
    });
    it("PUT test for courses dataset, adds a valid dataset", function () {
        this.timeout(10000);
        try {
            const dataset = "./test/data/coursesCPSC.zip";
            return chai.request(serverURL)
                .put("/dataset/coursesCPSC/courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res) {
                Util_1.default.trace("PUT request was a fulfilled and returned the proper result");
                chai_1.expect(res.status).to.be.equal(200);
            })
                .catch(function (err) {
                Util_1.default.error("PUT request was a rejected with the message: " + err.response.body.error);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            Util_1.default.error("PUT request was a rejected with the message: " + err.message);
            chai_1.expect.fail();
        }
    });
});
//# sourceMappingURL=Server.spec.js.map