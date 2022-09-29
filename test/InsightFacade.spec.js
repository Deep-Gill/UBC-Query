"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const chai_1 = require("chai");
const fs = require("fs-extra");
const chaiAsPromised = require("chai-as-promised");
const IInsightFacade_1 = require("../src/controller/IInsightFacade");
const InsightFacade_1 = require("../src/controller/InsightFacade");
const Util_1 = require("../src/Util");
const TestUtil_1 = require("./TestUtil");
chai.use(chaiAsPromised);
describe("InsightFacade Add/Remove/List Dataset", function () {
    const datasetsToLoad = {
        "courses": "./test/data/courses.zip",
        "coursesCPSC": "./test/data/coursesCPSC.zip",
        "courses_CPSC": "./test/data/courses_CPSC.zip",
        "courses CPSC": "./test/data/courses CPSC.zip",
        "coursesInvalid": "./test/data/coursesInvalid.zip",
        "coursesNoJson": "./test/data/coursesNoJson.zip",
        "coursesNoZip": "./test/data/courses/CPSC310",
        "coursesEmpty": "./test/data/coursesEmpty.zip",
        "rooms": "./test/data/rooms.zip",
    };
    let datasets = {};
    let insightFacade;
    const cacheDir = __dirname + "/../data";
    before(function () {
        Util_1.default.test(`Before all`);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs
                .readFileSync(datasetsToLoad[id])
                .toString("base64");
        }
        try {
            insightFacade = new InsightFacade_1.default();
        }
        catch (err) {
            Util_1.default.error(err);
        }
    });
    beforeEach(function () {
        Util_1.default.test(`BeforeTest: ${this.currentTest.title}`);
    });
    after(function () {
        Util_1.default.test(`After: ${this.test.parent.title}`);
    });
    afterEach(function () {
        Util_1.default.test(`AfterTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade_1.default();
        }
        catch (err) {
            Util_1.default.error(err);
        }
    });
    it("Should add a valid dataset", function () {
        const id = "courses";
        const expected = [id];
        const futureResult = insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        return chai_1.expect(futureResult).to.eventually.deep.equal(expected);
    });
    it("Should add a valid rooms dataset", function () {
        const id = "rooms";
        const expected = [id];
        const futureResult = insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Rooms);
        return chai_1.expect(futureResult).to.eventually.deep.equal(expected);
    });
    it("Should not add valid dataset that contains the same id and return error", function () {
        const id = "courses";
        const expected = [id];
        const futureResult = insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        return chai_1.expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
            return chai_1.expect(insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
        });
    });
    it("Should add two id's of different names", function () {
        const id1 = "courses";
        let expected = [id1];
        const futureResult = insightFacade.addDataset(id1, datasets[id1], IInsightFacade_1.InsightDatasetKind.Courses);
        return chai_1.expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
            const id2 = "coursesCPSC";
            expected = [id1, id2];
            const futureResult2 = insightFacade.addDataset(id2, datasets[id2], IInsightFacade_1.InsightDatasetKind.Courses);
            return chai_1.expect(futureResult2).to.eventually.have.members(expected);
        });
    });
    it("Should return an error when invalid id (containing underscore) is provided", function () {
        const id = "courses_CPSC";
        return chai_1.expect(insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
    });
    it("Should return an error when invalid id (containing only spaces) is provided", function () {
        const id1 = "courses CPSC";
        const id2 = "        ";
        const expected = [id1];
        const futureResult = insightFacade.addDataset(id1, datasets[id1], IInsightFacade_1.InsightDatasetKind.Courses);
        return chai_1.expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
            return chai_1.expect(insightFacade.addDataset(id2, datasets[id1], IInsightFacade_1.InsightDatasetKind.Courses)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
        });
    });
    it("Should return an error when invalid id (containing underscore) is provided", function () {
        const id = "courses_CPSC";
        return chai_1.expect(insightFacade.removeDataset(id)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
    });
    it("Should return error when invalid id (containing only spaces) is provided", function () {
        const id1 = "courses CPSC";
        const id2 = "        ";
        return insightFacade.addDataset(id1, datasets[id1], IInsightFacade_1.InsightDatasetKind.Courses).then(() => {
            const futureResult = insightFacade.removeDataset(id1);
            return chai_1.expect(futureResult).to.eventually.deep.equal(id1);
        }).then(() => {
            return chai_1.expect(insightFacade.addDataset(id2, datasets[id1], IInsightFacade_1.InsightDatasetKind.Courses)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
        }).then(() => {
            return chai_1.expect(insightFacade.removeDataset(id2)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
        });
    });
    it("Should return an error when trying to add a dataset with null id", function () {
        const id = "courses";
        return chai_1.expect(insightFacade.addDataset(null, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
    });
    it("Should return an error when trying to add a dataset with null kind", function () {
        const id = "courses";
        return chai_1.expect(insightFacade.addDataset(id, datasets[id], null)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
    });
    it("Should return an error when trying to remove a dataset with null id", function () {
        return chai_1.expect(insightFacade.removeDataset(null)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
    });
    it("Should remove a valid dataset that has already been added", function () {
        const id = "courses";
        return insightFacade
            .addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses)
            .then(() => {
            const futureResult = insightFacade.removeDataset(id);
            return chai_1.expect(futureResult).to.eventually.deep.equal(id);
        });
    });
    it("Should return an error when a dataset is removed that has not been added", function () {
        const id = "courses";
        const id2 = "courses CPSC";
        return chai_1.expect(insightFacade.removeDataset(id)).to.eventually.be.rejectedWith(IInsightFacade_1.NotFoundError)
            .then(() => {
            return insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        })
            .then(() => {
            return chai_1.expect(insightFacade.removeDataset(id2)).to.eventually.be.rejectedWith(IInsightFacade_1.NotFoundError);
        });
    });
    it("Should return an error when removing a dataset that has already been removed", function () {
        const id = "courses";
        return insightFacade
            .addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses)
            .then(() => {
            return insightFacade.removeDataset(id);
        })
            .then(() => {
            return chai_1.expect(insightFacade.removeDataset(id)).to.eventually.be.rejectedWith(IInsightFacade_1.NotFoundError);
        });
    });
    it("Should return an error when a dataset from a non-zip file is added", function () {
        const id = "coursesNoZip";
        return chai_1.expect(insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
    });
    it("Should return error when dataset is added that doesn't contain JSON objects", function () {
        const id = "coursesNoJson";
        return chai_1.expect(insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
    });
    it("Should return an error when dataset is added that is empty", function () {
        const id = "coursesEmpty";
        return chai_1.expect(insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
    });
    it("Should return error when dataset is added that doesn't have any information", function () {
        const id = "coursesInvalid";
        return chai_1.expect(insightFacade.addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses)).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
    });
    it("listDatasets should return an empty array when no dataset is added", function () {
        const futureResult = insightFacade.listDatasets();
        return futureResult.then((result) => chai_1.expect(result.length).to.deep.equal(0));
    });
    it("listDatasets should return an empty array when a dataset is added and removed", function () {
        const id = "courses";
        return insightFacade
            .addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses)
            .then(() => {
            return insightFacade.removeDataset(id);
        })
            .then(() => {
            const futureResult = insightFacade.listDatasets();
            return futureResult.then((result) => {
                chai_1.expect(result.length).to.deep.equal(0);
            });
        });
    });
    it("listDatasets should return the id of the dataset that were added", function () {
        const id = "courses";
        return insightFacade
            .addDataset(id, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses)
            .then(() => {
            const futureResult = insightFacade.listDatasets();
            return futureResult.then((result) => {
                chai_1.expect(result.length).to.deep.equal(1);
                chai_1.expect(result[0].id).to.deep.equal(id);
                chai_1.expect(result[0].kind).to.deep.equal(IInsightFacade_1.InsightDatasetKind.Courses);
                chai_1.expect(result[0].numRows).to.deep.equal(64612);
            });
        });
    });
    it("listDatasets should return all the added datasets in an array", function () {
        const id = "courses";
        const d1 = "d1";
        const d2 = "d2";
        const d3 = "d3";
        this.timeout(10000);
        return insightFacade.addDataset(d1, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses)
            .then(() => {
            return insightFacade.addDataset(d2, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        })
            .then(() => {
            return insightFacade.addDataset(d3, datasets[id], IInsightFacade_1.InsightDatasetKind.Courses);
        })
            .then(() => {
            const futureResult = insightFacade.listDatasets();
            return futureResult.then((result) => {
                chai_1.expect(result.length).to.deep.equal(3);
                chai_1.expect(result).to.have.deep.members([
                    { kind: IInsightFacade_1.InsightDatasetKind.Courses, numRows: 64612, id: "d1" },
                    { kind: IInsightFacade_1.InsightDatasetKind.Courses, numRows: 64612, id: "d2" },
                    { kind: IInsightFacade_1.InsightDatasetKind.Courses, numRows: 64612, id: "d3" },
                ]);
            });
        });
    });
});
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery = {
        courses: {
            path: "./test/data/courses.zip",
            kind: IInsightFacade_1.InsightDatasetKind.Courses,
        },
        data: {
            path: "./test/data/courses.zip",
            kind: IInsightFacade_1.InsightDatasetKind.Courses,
        },
        rooms: {
            path: "./test/data/rooms.zip",
            kind: IInsightFacade_1.InsightDatasetKind.Rooms,
        },
    };
    let insightFacade;
    let testQueries = [];
    before(function () {
        Util_1.default.test(`Before: ${this.test.parent.title}`);
        try {
            testQueries = TestUtil_1.default.readTestQueries();
        }
        catch (err) {
            chai_1.expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }
        const loadDatasetPromises = [];
        insightFacade = new InsightFacade_1.default();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });
    beforeEach(function () {
        this.timeout(10000);
        Util_1.default.test(`BeforeTest: ${this.currentTest.title}`);
    });
    after(function () {
        Util_1.default.test(`After: ${this.test.parent.title}`);
    });
    afterEach(function () {
        Util_1.default.test(`AfterTest: ${this.currentTest.title}`);
    });
    it("run a performQuery test to debug", function () {
        const fileName = "test/queries/C2/Valid/varietyOfKeys.json";
        let ourTest;
        for (const test of testQueries) {
            if (test.filename === fileName) {
                ourTest = test;
                break;
            }
        }
        const futureResult = insightFacade.performQuery(ourTest.query);
        return TestUtil_1.default.verifyQueryResult(futureResult, ourTest);
    });
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function () {
                    const futureResult = insightFacade.performQuery(test.query);
                    return TestUtil_1.default.verifyQueryResult(futureResult, test);
                });
            }
        });
    });
});
//# sourceMappingURL=InsightFacade.spec.js.map