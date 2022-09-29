import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError,
} from "./IInsightFacade";
import QueryChecker from "./QueryChecker";
import QueryPerformer from "./QueryPerformer";
import QueryHelper from "./QueryHelper";
import QuerySorter from "./QuerySorter";
import QueryTransformer from "./QueryTransformer";
import QueryValidator from "./QueryValidator";
import DatasetProcessor, {Data, SectionData} from "./DatasetProcessor";

export interface DatasetEntry {
    header: InsightDataset;
    content: Data[];
}


export default class InsightFacade implements IInsightFacade {
    public datasets: Map<string, DatasetEntry>;
    private performer: QueryPerformer = new QueryPerformer();
    private helper: QueryHelper = new QueryHelper();
    private transformer: QueryTransformer = new QueryTransformer();
    private sorter: QuerySorter = new QuerySorter();
    private validator: QueryValidator = new QueryValidator();
    private datasetProcessor: DatasetProcessor = new DatasetProcessor();

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.datasets = new Map();
    }

    private addAllSectionDataToDataset(ListOfCourses: any[], allSectionsOfDataset: SectionData[]): void {
        let i: number;
        const numOfCourses: number = ListOfCourses.length;
        // Iterate over every single course
        for (i = 0; i < numOfCourses; i++) {
            // convert the data in a course from string to a JavaScript object
            const data: string = ListOfCourses[i];
            let course: any;
            try {
                course = JSON.parse(data);
            } catch (e) {
                throw new InsightError("Error reading JSON");
            }
            const ListOfSections: any[] = course.result;
            let j: number;
            const numOfSections = ListOfSections.length;
            // Iterate over every single section in a course
            for (j = 0; j < numOfSections; j++) {
                const section: any = ListOfSections[j];
                let sectionData: SectionData = {
                    dept: section.Subject,
                    id: section.Course,
                    avg: section.Avg,
                    instructor: section.Professor,
                    title: section.Title,
                    pass: section.Pass,
                    fail: section.Fail,
                    audit: section.Audit,
                    uuid: "" + section.id,
                    year: 0
                };
                if (section.Section === "overall") {
                    sectionData.year = 1900;
                } else {
                    sectionData.year = Number(section.Year);
                }
                allSectionsOfDataset.push(sectionData);
            }
        }
    }

    private runChecks(id: string, kind: InsightDatasetKind): boolean {
        let fs = require("fs");
        const IDIsGood = this.validator.checkID(id);
        if (IDIsGood !== null) {
            return false;
        }
        if (this.datasets.has(id)) {
            return false;
        }
        if (kind === null || kind === undefined) {
            return false;
        }
        if (!fs.existsSync("./storage")) {
            fs.mkdirSync("./storage");
        }
        return true;
    }

    private processCourses(id: string, courses: any, newHeader: InsightDataset): string[] {
        let allSectionsOfDataset: any[] = [];
        let fs = require("fs");

        this.addAllSectionDataToDataset(courses, allSectionsOfDataset);
        newHeader.numRows = allSectionsOfDataset.length;
        if (allSectionsOfDataset.length === 0) {
            throw new InsightError("Dataset cannot have zero sections.");
        }
        this.datasets.set(id, {header: newHeader, content: allSectionsOfDataset});
        let data: string = JSON.stringify(allSectionsOfDataset);
        if (fs.existsSync("./storage")) {
            fs.writeFileSync("./storage/courses_" + id, data, "utf8");
        }
        return [...this.datasets.keys()];
    }

    public addDataset(
        id: string,
        content: string,
        kind: InsightDatasetKind,
    ): Promise<string[]> {
        const fs = require("fs");
        if (content === null || content === undefined) {
            return Promise.reject(new InsightError("Content cannot be null or undefined"));
        }
        if (!this.runChecks(id, kind)) {
            return Promise.reject(new InsightError("Invalid ID or dataset kind"));
        }
        const newHeader: InsightDataset = {
            kind: kind,
            numRows: 0,
            id: id,
        };
        let self = this;
        if (kind === InsightDatasetKind.Rooms) {
            return this.datasetProcessor.addRoomDataset(content).then((ListOfRooms) => {
                    newHeader.numRows = ListOfRooms.length;
                    self.datasets.set(id, {header: newHeader, content: ListOfRooms});
                    let data: string = JSON.stringify(ListOfRooms);
                    if (fs.existsSync("./storage")) {
                        fs.writeFileSync("./storage/rooms_" + id, data, "utf8");
                    }
                    return Promise.resolve([...self.datasets.keys()]);
                }).catch((error) => {
                    return Promise.reject(new InsightError(error.message));
            });
        }
        return DatasetProcessor.getAllCourses(content).then((ListOfCourses: any[]) => {
                return Promise.all(ListOfCourses).then(function (courses: any) {
                    try {
                        return Promise.resolve(self.processCourses(id, courses, newHeader));
                    } catch (e) {
                        return Promise.reject(new InsightError(e.message));
                    }
                }).catch((error: any) => {
                    return Promise.reject(new InsightError(error.message));
                });
            }).catch((error: any) => {
                return Promise.reject(new InsightError(error.message));
            });
    }

    public removeDataset(id: string): Promise<string> {
        const IDIsGood = this.validator.checkID(id);
        if (IDIsGood !== null) {
            return Promise.reject(new InsightError(IDIsGood));
        }
        if (!this.datasets.has(id)) {
            return Promise.reject(new NotFoundError("Could not find dataset"));
        }
        const fs = require("fs");
        if (fs.existsSync("./storage")) {
            if (this.datasets.get(id).header.kind === InsightDatasetKind.Courses) {
                fs.unlinkSync("./storage/courses_" + id);
            } else if (this.datasets.get(id).header.kind === InsightDatasetKind.Rooms) {
                fs.unlinkSync("./storage/rooms_" + id);
            }
        }
        this.datasets.delete(id);
        return Promise.resolve(id);
    }

    public listDatasets(): Promise<InsightDataset[]> {
        let results: InsightDataset[] = [];
        this.datasets.forEach(function (value) {
            results.push(value.header);
        });
        return Promise.resolve(results);
    }


    public performQuery(query: any): Promise<any[]> {
        if (typeof query === "string") {
            query = JSON.parse(query);
        }
        if (!query || !(typeof query === "object") || !(query.constructor === ({}).constructor)) {
            return Promise.reject(new InsightError("Malformed query."));
        }
        if (!QueryChecker.checkQueryValidity(query, this.datasets)) {
            return Promise.reject(new InsightError("Incorrect query structure."));
        }

        if (!this.datasets.has(QueryChecker.idstring)) {
            return Promise.reject(new InsightError("Dataset doesn't exist."));
        }
        let where: any = query.WHERE;
        const isTransformation: boolean = (query.TRANSFORMATIONS !== undefined);
        let requiredFields: string[] = [].concat(query["OPTIONS"].COLUMNS);
        // let id: string = this.helper.setId(isTransformation, query, requiredFields);
        let id: string = QueryChecker.idstring;
        requiredFields = this.helper.setRequiredFields(isTransformation, query, requiredFields, id);
        let results: any[] = [];
        let changed: boolean = false;
        let identifierField: string = this.helper.setIdentifierField(id, this.datasets);
        if (!requiredFields.includes(identifierField)) {
            requiredFields.push(identifierField);
            changed = true;
        }
        results = this.queryWHERE(where, results, requiredFields);
        if (Object.keys(where).length === 0) {
            results = this.helper.addRequiredFields(requiredFields, id, this.datasets);
        }
        if (changed) {
            requiredFields.pop();
            this.helper.removeIdentifier(identifierField, results);
        }
        if (results.length > 0 && isTransformation) {
            results = this.transformer.queryTRANSFORMATIONS(results, query.TRANSFORMATIONS, query.OPTIONS.COLUMNS);
        }
        if (results.length > 5000) {
            return Promise.reject(new ResultTooLargeError("Results cannot contain more than 5000 results."));
        }
        let order: any = query.OPTIONS.ORDER;
        if (order !== undefined) {
            this.sorter.sort(results, order);
        }
        return Promise.resolve(results);
    }

    private queryWHERE(where: any, results: any[], requiredFields: string[]): any[] {
        for (let key in where) {
            if (QueryChecker.MCOMPARATOR.includes(key)) {
                results = this.performer.queryMCOMP(key, requiredFields, where[key], false, this.datasets);
            }
            if (QueryChecker.SCOMPARATOR === key) {
                results = this.performer.querySCOMP(requiredFields, where[key], false, this.datasets);
            }
            if (QueryChecker.NEGATION === key) {
                results = this.performer.queryNEG(requiredFields, where[key], 1, this.datasets);
            }
            if (QueryChecker.LOGIC.includes(key)) {
                results = this.performer.queryLOGIC(key, requiredFields, where[key], 0, this.datasets);
            }
        }
        return results;
    }
}
