"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("../Util");
const IInsightFacade_1 = require("./IInsightFacade");
const QueryChecker_1 = require("./QueryChecker");
const QueryPerformer_1 = require("./QueryPerformer");
const QueryHelper_1 = require("./QueryHelper");
const QuerySorter_1 = require("./QuerySorter");
const QueryTransformer_1 = require("./QueryTransformer");
const QueryValidator_1 = require("./QueryValidator");
const DatasetProcessor_1 = require("./DatasetProcessor");
class InsightFacade {
    constructor() {
        this.performer = new QueryPerformer_1.default();
        this.helper = new QueryHelper_1.default();
        this.transformer = new QueryTransformer_1.default();
        this.sorter = new QuerySorter_1.default();
        this.validator = new QueryValidator_1.default();
        this.datasetProcessor = new DatasetProcessor_1.default();
        Util_1.default.trace("InsightFacadeImpl::init()");
        this.datasets = new Map();
    }
    addAllSectionDataToDataset(ListOfCourses, allSectionsOfDataset) {
        let i;
        const numOfCourses = ListOfCourses.length;
        for (i = 0; i < numOfCourses; i++) {
            const data = ListOfCourses[i];
            let course;
            try {
                course = JSON.parse(data);
            }
            catch (e) {
                throw new IInsightFacade_1.InsightError("Error reading JSON");
            }
            const ListOfSections = course.result;
            let j;
            const numOfSections = ListOfSections.length;
            for (j = 0; j < numOfSections; j++) {
                const section = ListOfSections[j];
                let sectionData = {
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
                }
                else {
                    sectionData.year = Number(section.Year);
                }
                allSectionsOfDataset.push(sectionData);
            }
        }
    }
    runChecks(id, kind) {
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
    processCourses(id, courses, newHeader) {
        let allSectionsOfDataset = [];
        let fs = require("fs");
        this.addAllSectionDataToDataset(courses, allSectionsOfDataset);
        newHeader.numRows = allSectionsOfDataset.length;
        if (allSectionsOfDataset.length === 0) {
            throw new IInsightFacade_1.InsightError("Dataset cannot have zero sections.");
        }
        this.datasets.set(id, { header: newHeader, content: allSectionsOfDataset });
        let data = JSON.stringify(allSectionsOfDataset);
        if (fs.existsSync("./storage")) {
            fs.writeFileSync("./storage/courses_" + id, data, "utf8");
        }
        return [...this.datasets.keys()];
    }
    addDataset(id, content, kind) {
        const fs = require("fs");
        if (content === null || content === undefined) {
            return Promise.reject(new IInsightFacade_1.InsightError("Content cannot be null or undefined"));
        }
        if (!this.runChecks(id, kind)) {
            return Promise.reject(new IInsightFacade_1.InsightError("Invalid ID or dataset kind"));
        }
        const newHeader = {
            kind: kind,
            numRows: 0,
            id: id,
        };
        let self = this;
        if (kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
            return this.datasetProcessor.addRoomDataset(content).then((ListOfRooms) => {
                newHeader.numRows = ListOfRooms.length;
                self.datasets.set(id, { header: newHeader, content: ListOfRooms });
                let data = JSON.stringify(ListOfRooms);
                if (fs.existsSync("./storage")) {
                    fs.writeFileSync("./storage/rooms_" + id, data, "utf8");
                }
                return Promise.resolve([...self.datasets.keys()]);
            }).catch((error) => {
                return Promise.reject(new IInsightFacade_1.InsightError(error.message));
            });
        }
        return DatasetProcessor_1.default.getAllCourses(content).then((ListOfCourses) => {
            return Promise.all(ListOfCourses).then(function (courses) {
                try {
                    return Promise.resolve(self.processCourses(id, courses, newHeader));
                }
                catch (e) {
                    return Promise.reject(new IInsightFacade_1.InsightError(e.message));
                }
            }).catch((error) => {
                return Promise.reject(new IInsightFacade_1.InsightError(error.message));
            });
        }).catch((error) => {
            return Promise.reject(new IInsightFacade_1.InsightError(error.message));
        });
    }
    removeDataset(id) {
        const IDIsGood = this.validator.checkID(id);
        if (IDIsGood !== null) {
            return Promise.reject(new IInsightFacade_1.InsightError(IDIsGood));
        }
        if (!this.datasets.has(id)) {
            return Promise.reject(new IInsightFacade_1.NotFoundError("Could not find dataset"));
        }
        const fs = require("fs");
        if (fs.existsSync("./storage")) {
            if (this.datasets.get(id).header.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
                fs.unlinkSync("./storage/courses_" + id);
            }
            else if (this.datasets.get(id).header.kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
                fs.unlinkSync("./storage/rooms_" + id);
            }
        }
        this.datasets.delete(id);
        return Promise.resolve(id);
    }
    listDatasets() {
        let results = [];
        this.datasets.forEach(function (value) {
            results.push(value.header);
        });
        return Promise.resolve(results);
    }
    performQuery(query) {
        if (typeof query === "string") {
            query = JSON.parse(query);
        }
        if (!query || !(typeof query === "object") || !(query.constructor === ({}).constructor)) {
            return Promise.reject(new IInsightFacade_1.InsightError("Malformed query."));
        }
        if (!QueryChecker_1.default.checkQueryValidity(query, this.datasets)) {
            return Promise.reject(new IInsightFacade_1.InsightError("Incorrect query structure."));
        }
        if (!this.datasets.has(QueryChecker_1.default.idstring)) {
            return Promise.reject(new IInsightFacade_1.InsightError("Dataset doesn't exist."));
        }
        let where = query.WHERE;
        const isTransformation = (query.TRANSFORMATIONS !== undefined);
        let requiredFields = [].concat(query["OPTIONS"].COLUMNS);
        let id = QueryChecker_1.default.idstring;
        requiredFields = this.helper.setRequiredFields(isTransformation, query, requiredFields, id);
        let results = [];
        let changed = false;
        let identifierField = this.helper.setIdentifierField(id, this.datasets);
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
            return Promise.reject(new IInsightFacade_1.ResultTooLargeError("Results cannot contain more than 5000 results."));
        }
        let order = query.OPTIONS.ORDER;
        if (order !== undefined) {
            this.sorter.sort(results, order);
        }
        return Promise.resolve(results);
    }
    queryWHERE(where, results, requiredFields) {
        for (let key in where) {
            if (QueryChecker_1.default.MCOMPARATOR.includes(key)) {
                results = this.performer.queryMCOMP(key, requiredFields, where[key], false, this.datasets);
            }
            if (QueryChecker_1.default.SCOMPARATOR === key) {
                results = this.performer.querySCOMP(requiredFields, where[key], false, this.datasets);
            }
            if (QueryChecker_1.default.NEGATION === key) {
                results = this.performer.queryNEG(requiredFields, where[key], 1, this.datasets);
            }
            if (QueryChecker_1.default.LOGIC.includes(key)) {
                results = this.performer.queryLOGIC(key, requiredFields, where[key], 0, this.datasets);
            }
        }
        return results;
    }
}
exports.default = InsightFacade;
//# sourceMappingURL=InsightFacade.js.map