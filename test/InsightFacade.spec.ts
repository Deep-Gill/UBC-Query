import * as chai from "chai";
import {expect} from "chai";
import * as fs from "fs-extra";
import * as chaiAsPromised from "chai-as-promised";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError, } from "../../../Desktop/project_team192/src/controller/IInsightFacade";
import InsightFacade from "../../../Desktop/project_team192/src/controller/InsightFacade";
import Log from "../../../Desktop/project_team192/src/Util";
import TestUtil from "./TestUtil";
// import { NotFoundError } from "restify";

// This extends chai with assertions that natively support Promises
chai.use(chaiAsPromised);

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any; // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string; // This is injected when reading the file
}

describe("InsightFacade Add/Remove/List Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
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
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs
                .readFileSync(datasetsToLoad[id])
                .toString("base64");
        }
        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs after each test, which should make each test independent from the previous one
        Log.test(`AfterTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid rooms dataset", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Rooms,
        );
        return expect(futureResult).to.eventually.deep.equal(expected);
    });

    // When a duplicate id is added, the id should be rejected and not saved, hence not returned.
    // Also an error should return
    it("Should not add valid dataset that contains the same id and return error", function () {
        const id: string = "courses";
        const expected: string[] = [id];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id,
            datasets[id],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
                return expect(
                    insightFacade.addDataset(
                        id,
                        datasets[id],
                        InsightDatasetKind.Courses,
                    )
                ).to.eventually.be.rejectedWith(InsightError);
            });
    });


    // When two different id's are added, they should both be accepted and added
    it("Should add two id's of different names", function () {
        const id1: string = "courses";
        let expected: string[] = [id1];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
            id1,
            datasets[id1],
            InsightDatasetKind.Courses,
        );
        return expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
                const id2: string = "coursesCPSC";
                expected = [id1, id2];
                const futureResult2: Promise<string[]> = insightFacade.addDataset(
                                                              id2,
                                                              datasets[id2],
                                                              InsightDatasetKind.Courses);
                return expect(futureResult2).to.eventually.have.members(expected);
            });
    });

    // When an id is added that contains at least one underscore it should be rejected and an error should return
    it("Should return an error when invalid id (containing underscore) is provided", function () {
        const id: string = "courses_CPSC";
        return expect(
            insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses,
            ),
        ).to.eventually.be.rejectedWith(InsightError);
    });

    // When an id is added that contains only whitespaces it should be rejected and error should return
    it("Should return an error when invalid id (containing only spaces) is provided", function () {
        const id1: string = "courses CPSC";
        const id2: string = "        ";
        const expected: string[] = [id1];
        const futureResult: Promise<string[]> = insightFacade.addDataset(
                                                        id1,
                                                        datasets[id1],
                                                        InsightDatasetKind.Courses
                                                        );
        return expect(futureResult)
            .to.eventually.deep.equal(expected)
            .then(() => {
                return expect(
                    insightFacade.addDataset(
                        id2,
                        datasets[id1],
                        InsightDatasetKind.Courses,
                    ),
                ).to.eventually.be.rejectedWith(InsightError);
            });
    });

    // When an id is removed that contains at least one underscore it should be rejected and an error should return
    it("Should return an error when invalid id (containing underscore) is provided", function () {
        const id: string = "courses_CPSC";
        return expect(
            insightFacade.removeDataset(id),
        ).to.eventually.be.rejectedWith(InsightError);
    });

    // When an id is removed that contains only whitespaces it should be rejected and an error should return
    it("Should return error when invalid id (containing only spaces) is provided", function () {
        const id1: string = "courses CPSC";
        const id2: string = "        ";
        return insightFacade.addDataset(
            id1,
            datasets[id1],
            InsightDatasetKind.Courses,
        ).then(() => {
            const futureResult: Promise<string> = insightFacade.removeDataset(id1);
            return expect(futureResult).to.eventually.deep.equal(id1);
        }).then(() => {
            return expect(
                insightFacade.addDataset(
                    id2,
                    datasets[id1],
                    InsightDatasetKind.Courses,
                )
            ).to.eventually.be.rejectedWith(InsightError);
        }).then(() => {
            return expect(insightFacade.removeDataset(id2)).to.eventually.be.rejectedWith(InsightError);
        });
    });

    it("Should return an error when trying to add a dataset with null id", function () {
        const id: string = "courses";
        return expect(
            insightFacade.addDataset(
                null,
                datasets[id],
                InsightDatasetKind.Courses,
            ),
        ).to.eventually.be.rejectedWith(InsightError);
    });

    it("Should return an error when trying to add a dataset with null kind", function () {
        const id: string = "courses";
        return expect(
            insightFacade.addDataset(id, datasets[id], null),
        ).to.eventually.be.rejectedWith(InsightError);
    });

    it("Should return an error when trying to remove a dataset with null id", function () {
        return expect(
            insightFacade.removeDataset(null),
        ).to.eventually.be.rejectedWith(InsightError);
    });

    // valid dataset that is already added should be succesfully removed
    it("Should remove a valid dataset that has already been added", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                const futureResult: Promise<
                    string
                > = insightFacade.removeDataset(id);
                return expect(futureResult).to.eventually.deep.equal(id);
            });
    });

    // valid id that isn't already added should return an error
    it("Should return an error when a dataset is removed that has not been added", function () {
        const id: string = "courses";
        const id2: string = "courses CPSC";
        return expect(insightFacade.removeDataset(id)).to.eventually.be.rejectedWith(NotFoundError)
            .then(() => {
                return insightFacade.addDataset(
                    id,
                    datasets[id],
                    InsightDatasetKind.Courses,
                );
            })
            .then(() => {
                return expect(insightFacade.removeDataset(id2)).to.eventually.be.rejectedWith(NotFoundError);
            });
    });

    it("Should return an error when removing a dataset that has already been removed", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade.removeDataset(id);
            })
            .then(() => {
                return expect(
                    insightFacade.removeDataset(id),
                ).to.eventually.be.rejectedWith(NotFoundError);
            });
    });

    // a non-zip file should not be added and an error should return
    it("Should return an error when a dataset from a non-zip file is added", function () {
        const id: string = "coursesNoZip";
        return expect(
            insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses,
            ),
        ).to.eventually.be.rejectedWith(InsightError);
    });

    // a zip file that doesn't contain JSON objects shouldn't be added and an error should return when done so
    it("Should return error when dataset is added that doesn't contain JSON objects", function () {
        const id: string = "coursesNoJson";
        return expect(
            insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses,
            ),
        ).to.eventually.be.rejectedWith(InsightError);
    });

    // a dataset that is empty should be rejected and an error should return
    it("Should return an error when dataset is added that is empty", function () {
        const id: string = "coursesEmpty";
        return expect(
            insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses,
            ),
        ).to.eventually.be.rejectedWith(InsightError);
    });

    // a dataset that doesn't contain any information should be rejected and an error should return
    it("Should return error when dataset is added that doesn't have any information", function () {
        const id: string = "coursesInvalid";
        return expect(
            insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses,
            ),
        ).to.eventually.be.rejectedWith(InsightError);
    });

    // listdatasets should return an empty array when no dataset is added
    it("listDatasets should return an empty array when no dataset is added", function () {
        const futureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
        return futureResult.then((result: InsightDataset[]) =>
            expect(result.length).to.deep.equal(0));
    });

    // listDatasets should return an empty array when a dataset is added and then removed
    it("listDatasets should return an empty array when a dataset is added and removed", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade.removeDataset(id);
            })
            .then(() => {
                const futureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
                return futureResult.then((result: InsightDataset[]) => {
                    expect(result.length).to.deep.equal(0);
                });
            });
    });

    // listDatasets should return the id that was added
    it("listDatasets should return the id of the dataset that were added", function () {
        const id: string = "courses";
        return insightFacade
            .addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                const futureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
                return futureResult.then((result: InsightDataset[]) => {
                    expect(result.length).to.deep.equal(1);
                    expect(result[0].id).to.deep.equal(id);
                    expect(result[0].kind).to.deep.equal(InsightDatasetKind.Courses);
                    expect(result[0].numRows).to.deep.equal(64612);
                });
            });
    });

    // listDatasets should return all the datasets that were added
    it("listDatasets should return all the added datasets in an array", function () {
        const id: string = "courses";
        const d1: string = "d1";
        const d2: string = "d2";
        const d3: string = "d3";
        this.timeout(10000);

        return insightFacade.addDataset(d1, datasets[id], InsightDatasetKind.Courses)
            .then(() => {
                return insightFacade.addDataset(
                    d2,
                    datasets[id],
                    InsightDatasetKind.Courses,
                );
            })
            .then(() => {
                return insightFacade.addDataset(
                    d3,
                    datasets[id],
                    InsightDatasetKind.Courses,
                );
            })
            .then(() => {
                // const expected1: InsightDataset = {id: d1, kind: InsightDatasetKind.Courses, numRows: 64612};
                // const expected2: InsightDataset = {id: d2, kind: InsightDatasetKind.Courses, numRows: 64612};
                // const expected3: InsightDataset = {id: d3, kind: InsightDatasetKind.Courses, numRows: 64612};
                const futureResult: Promise<InsightDataset[]> = insightFacade.listDatasets();
                return futureResult.then((result: InsightDataset[]) => {
                    expect(result.length).to.deep.equal(3);
                    expect(result).to.have.deep.members([
                                                         {kind: InsightDatasetKind.Courses, numRows: 64612, id: "d1"},
                                                         {kind: InsightDatasetKind.Courses, numRows: 64612, id: "d2"},
                                                         {kind: InsightDatasetKind.Courses, numRows: 64612, id: "d3"},
                                                         ]);
                });
            });
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: {
        [id: string]: { path: string; kind: InsightDatasetKind };
    } = {
        courses: {
            path: "./test/data/courses.zip",
            kind: InsightDatasetKind.Courses,
        },
        data: {
            path: "./test/data/courses.zip",
            kind: InsightDatasetKind.Courses,
        },
        rooms: {
            path: "./test/data/rooms.zip",
            kind: InsightDatasetKind.Rooms,
        },
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more test queries. ${err}`,
            );
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        insightFacade = new InsightFacade();
        for (const id of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[id];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(
                insightFacade.addDataset(id, data, ds.kind),
            );
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * TODO For C1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });

    beforeEach(function () {
        this.timeout(10000);
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it ("run a performQuery test to debug", function () {
        const fileName: string = "test/queries/C2/Valid/varietyOfKeys.json";
        let ourTest: ITestQuery;
        for (const test of testQueries) {
            if (test.filename === fileName) {
                ourTest = test;
                break;
            }
        }
        const futureResult: Promise<any[]> = insightFacade.performQuery(ourTest.query);
        return TestUtil.verifyQueryResult(futureResult, ourTest);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function () {
                    const futureResult: Promise<any[]> = insightFacade.performQuery(test.query);
                    return TestUtil.verifyQueryResult(futureResult, test);
                });
            }
        });
    });
});
