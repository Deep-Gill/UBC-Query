import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import {expect} from "chai";
import Log from "../src/Util";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;
    let serverURL: string = "http://localhost:4321";
    let fs = require("fs");
    let validQuery: any = {
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

    let validQuery2: any = {
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

    let invalidQuery: any = {
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

    let invalidQuery2: any = {
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
        facade = new InsightFacade();
        server = new Server(4321);
        // TODO: start server here once and handle errors properly
        try {
            server.start();
        } catch (err) {
            Log.error("Server returned an error when starting, " + err.message);
        }
    });

    after(function () {
        // TODO: stop server here once!
        server.stop();
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        const file: string = "./test/data/courses.zip";
        if (!fs.existsSync("./storage/courses_courses")) {
            chai.request(serverURL)
                .put("/dataset/courses/courses")
                .send(fs.readFileSync(file))
                .set("Content-Type", "application/x-zip-compressed")
                .then((response) => {
                    Log.trace("added file courses_courses in ./storage directory");
            }).catch((err) => {
                Log.error("PUT returned an error with the message: " + err.response.body.error);
            });
        }
        return fs.readdirSync("./storage").forEach(function (relativePath: string) {
            if (relativePath !== "courses_courses" && relativePath !== ".DS_Store") {
                if (fs.existsSync("./storage/" + relativePath)) {
                    const id: string = relativePath.split("_")[1];
                    const url: string = "/dataset/" + id;
                    return chai.request(serverURL).del(url).then((response) => {
                            Log.trace("deleting file: " + relativePath + " in ./storage directory");
                        }).catch((err) => {
                            Log.error("DEL returned an error with the message: " + err.response.body.error);
                        });
                }
            }
        });
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
        return fs.readdirSync("./storage").forEach(function (relativePath: string) {
            if (relativePath !== "courses_courses" && relativePath !== ".DS_Store") {
                if (fs.existsSync("./storage/" + relativePath)) {
                    const id: string = relativePath.split("_")[1];
                    const url: string = "/dataset/" + id;
                    return chai.request(serverURL).del(url).then((response) => {
                        Log.trace("deleting file: " + relativePath + " in ./storage directory");
                    }).catch((err) => {
                        Log.error("DEL returned an error with the message: " + err.response.body.error);
                    });
                }
            }
        });
    });

    // Sample on how to format PUT requests
    /*
    it("PUT test for courses dataset", function () {
        try {
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    */

    it("GET test, retrieves a list of added datasets from disk and memory", function () {
        try {
            const file: string = "./test/data/coursesCPSC.zip";
            return chai.request(serverURL)
                .put("/dataset/coursesCPSC/courses")
                .send(fs.readFileSync(file))
                .set("Content-Type", "application/x-zip-compressed")
                .then((response) => {
                    Log.trace("GET test added the dataset properly");
                    expect(response.body.result).to.have.deep.members(["courses", "coursesCPSC"]);
                    return expect(response.status).to.be.equal(200);
                }).then(() => {
                    return chai.request(serverURL)
                        .get("/datasets")
                        .then((response) => {
                            Log.trace("GET test returned the required result");
                            expect(response.status).to.be.equal(200);
                            expect(response.body.result).to.have.deep.members
                            ([
                                {id: "courses", kind: "courses", numRows: 64612},
                                {id: "coursesCPSC", kind: "courses", numRows: 248}
                                ]);
                        }).catch((err) => {
                            Log.error("GET test returned an error with the message: " + err.response.body.error);
                            expect.fail();
                        });
                }).catch((err) => {
                    Log.error("GET returned an error with the message: " + err.response.body.error);
                    expect.fail();
                });
        } catch (err) {
            Log.error("GET test returned an error with the message: " + err.message);
            expect.fail();
        }
    });

    it("GET test, retrieves a list of added datasets from disk", function () {
        try {
            return chai.request(serverURL)
                .get("/datasets")
                .then((response) => {
                    Log.trace("GET test returned the required result");
                    expect(response.status).to.be.equal(200);
                    expect(response.body.result).to.have.deep.members
                    ([{id: "courses", kind: "courses", numRows: 64612}]);
                }).catch((err) => {
                    Log.error("GET test returned an error with the message: " + err.response.body.error);
                    expect.fail();
                });
        } catch (err) {
            Log.error("GET test returned an error with the message: " + err.message);
            expect.fail();
        }
    });

    it("POST test,returns error because invalid query on dataset not stored in memory", function () {
        const dataset: string = "./test/data/courses.zip";
        this.timeout(35000);
        try {
            return chai.request(serverURL)
                .post("/query")
                .send(invalidQuery2)
                .then( (response) => {
                    Log.error("POST perfomed the query when it shouldn't have.");
                    expect.fail();
                }).catch((err) => {
                    Log.trace("POST returned an error with the message: " + err.response.body.error);
                    expect(err.response.status).to.be.equal(400);
                });
        } catch (err) {
            Log.error("POST returned an error");
            expect.fail();
        }
    });

    it("POST test, returns an error because of an invalid query", function () {
        const dataset: string = "./test/data/coursesCPSC.zip";
        this.timeout(35000);
        try {
            return chai.request(serverURL)
                .put("/dataset/coursesCPSC/courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then((response) => {
                    Log.trace("PUT added the dataset properly");
                    return expect(response.status).to.be.equal(200);
                }).then(() => {
                    return chai.request(serverURL)
                        .post("/query")
                        .send(invalidQuery)
                        .then( (response) => {
                            Log.error("POST perfomed the query when it shouldn't have.");
                            expect.fail();
                        }).catch((err) => {
                            Log.trace("POST returned an error with the message: " + err.response.body.error);
                            expect(err.response.status).to.be.equal(400);
                        });
                }).catch((err) => {
                    Log.error("POST returned an error with the message: " + err.response.body.error);
                    expect.fail();
                });
        } catch (err) {
            Log.error("POST returned an error");
            expect.fail();
        }
    });

    it("POST test, performs a valid query when dataset is stored in memory", function () {
        const dataset: string = "./test/data/coursesCPSC.zip";
        this.timeout(35000);
        try {
            return chai.request(serverURL)
                .put("/dataset/coursesCPSC/courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then((response) => {
                    Log.trace("PUT added the dataset properly");
                    return expect(response.status).to.be.equal(200);
                }).then(() => {
                    return chai.request(serverURL)
                        .post("/query")
                        .send(validQuery2)
                        .then( (response) => {
                            Log.trace("POST perfomed the query adequately.");
                            return expect(response.status).to.be.equal(200);
                        }).catch((err) => {
                            Log.error("POST returned an error with the message: " + err.response.body.error);
                            expect.fail();
                        });
                }).catch((err) => {
                    Log.error("POST returned an error with the message: " + err.response.body.error);
                    expect.fail();
                });
        } catch (err) {
            Log.error("POST returned an error");
            expect.fail();
        }
    });

    it("POST test, performs a valid query when dataset is not stored in memory", function () {
        const dataset: string = "./test/data/courses.zip";
        this.timeout(35000);
        try {
            return chai.request(serverURL)
                .post("/query")
                .send(validQuery)
                .then( (response) => {
                    Log.trace("POST returned the appropriate result when accessing dataset stored on disk.");
                    expect(response.status).to.be.equal(200);
                }).catch((err) => {
                    Log.error("POST returned an error with the message: " + err.response.body.error);
                    expect.fail();
                });
        } catch (err) {
            Log.error("POST returned an error");
            expect.fail();
        }
    });

    it("DEL test,removes a valid dataset that has not been added and with invalid id", function () {
        try {
            return chai.request(serverURL)
                .del("/dataset/courses_CPSC")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.trace("PUT request was a fulfilled when it shouldn't have");
                    expect.fail();
                }).catch((err) => {
                    Log.error("DEL test returned an error with message: " + err.response.body.error);
                    return expect(err.response.status).to.be.equal(400);
                });
        } catch (err) {
            Log.error("DEL test returned an error with message: " + err.message);
            expect.fail();
        }
    });

    it("DEL test, removes a valid dataset that has not been added", function () {
        try {
            return chai.request(serverURL)
                .del("/dataset/coursesCPSC")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.trace("PUT request was a fulfilled when it shouldn't have");
                    expect.fail();
                }).catch((err) => {
                    Log.error("DEL test returned an error with message: " + err.response.body.error);
                    return expect(err.response.status).to.be.equal(404);
                });
        } catch (err) {
            Log.error("DEL test returned an error with message: " + err.message);
            expect.fail();
        }
    });

    it("DEL test, removes a valid dataset that has been added", function () {
        try {
            const dataset: string = "./test/data/courses.zip";
            return chai.request(serverURL)
                .put("/dataset/coursesCPSC/courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.trace("PUT request was a fulfilled and returned the proper result");
                    return expect(res.status).to.be.equal(200);
                }).then(function () {
                    return chai.request(serverURL).del("/dataset/coursesCPSC").then(function (res: Response) {
                            expect(res.body.result).to.deep.equal("coursesCPSC");
                            return expect(res.status).to.be.equal(200);
                    });
                }).catch((err) => {
                    Log.error("DEL test returned an error with message: " + err.message);
                    expect.fail();
                });
        } catch (err) {
            Log.error("DEL test returned an error with message: " + err.message);
            expect.fail();
        }
    });

    it("PUT test, adds dataset from file that does not exist", function () {
        try {
            const dataset: string = "./test/data/noFile.zip";
            return chai.request(serverURL)
                .put("/dataset/coursesCPSC/courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.trace("PUT request was fulfilled when it shouldn't have.");
                    expect.fail();
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("PUT request was a rejected with the message: " + err.response.body.error);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.error("PUT request was a rejected like it should have");
        }
    });

    it("PUT test for courses dataset, rejects a dataset because of invalid id (   )", function () {
        try {
            const dataset: string = "./test/data/courses.zip";
            return chai.request(serverURL)
                .put("/dataset/       /courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.trace("PUT request was fulfilled when it shouldn't have.");
                    expect.fail();
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("PUT request was a rejected with the message: " + err.response.body.error);
                    expect(err.response.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            Log.error("PUT request was a rejected");
            expect.fail();
        }
    });

    it("PUT test for courses dataset, rejects a dataset because of invalid id (_)", function () {
        try {
            const dataset: string = "./test/data/courses.zip";
            return chai.request(serverURL)
                .put("/dataset/courses_CPSC/courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.trace("PUT request was fulfilled when it shouldn't have.");
                    expect.fail();
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("PUT request was a rejected with the message: " + err.response.body.error);
                    expect(err.response.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            Log.error("PUT request was a rejected");
            expect.fail();
        }
    });

    it("PUT test for courses dataset, adds a valid dataset", function () {
        this.timeout(10000);
        try {
            const dataset: string = "./test/data/coursesCPSC.zip";
            return chai.request(serverURL)
                .put("/dataset/coursesCPSC/courses")
                .send(fs.readFileSync(dataset))
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    Log.trace("PUT request was a fulfilled and returned the proper result");
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.error("PUT request was a rejected with the message: " + err.response.body.error);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.error("PUT request was a rejected with the message: " + err.message);
            expect.fail();
        }
    });

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
