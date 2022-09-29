"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const QueryChecker_1 = require("./QueryChecker");
const QueryHelper_1 = require("./QueryHelper");
class QueryPerformer {
    constructor() {
        this.helper = new QueryHelper_1.default();
    }
    queryLOGIC(Logic, requiredFields, objectArr, countNot, datasets) {
        let results = [];
        let isNot = true;
        if (countNot % 2 === 0) {
            isNot = false;
        }
        switch (Logic) {
            case "AND":
                if (isNot) {
                    results = this.queryOR(requiredFields, objectArr, countNot, datasets);
                    break;
                }
                else {
                    results = this.queryAND(requiredFields, objectArr, countNot, datasets);
                    break;
                }
            case "OR":
                if (isNot) {
                    results = this.queryAND(requiredFields, objectArr, countNot, datasets);
                    break;
                }
                else {
                    results = this.queryOR(requiredFields, objectArr, countNot, datasets);
                    break;
                }
        }
        return results;
    }
    queryAND(requiredFields, objectArr, countNot, datasets) {
        let arraysToIntersect = [];
        let interesectedArr = [];
        const numOfObjects = objectArr.length;
        let isNot = true;
        if (countNot % 2 === 0) {
            isNot = false;
        }
        for (let i = 0; i < numOfObjects; i++) {
            let result = [];
            let obj = objectArr[i];
            for (let key in obj) {
                if (QueryChecker_1.default.SCOMPARATOR === key) {
                    result = this.querySCOMP(requiredFields, obj[key], isNot, datasets);
                }
                else if (QueryChecker_1.default.MCOMPARATOR.includes(key)) {
                    result = this.queryMCOMP(key, requiredFields, obj[key], isNot, datasets);
                }
                else if (QueryChecker_1.default.NEGATION === key) {
                    countNot++;
                    result = this.queryNEG(requiredFields, obj[key], countNot, datasets);
                }
                else if (QueryChecker_1.default.LOGIC.includes(key)) {
                    result = this.queryLOGIC(key, requiredFields, obj[key], countNot, datasets);
                }
            }
            arraysToIntersect.push(result);
        }
        const numOfArraysToIntersect = arraysToIntersect.length;
        if (numOfArraysToIntersect > 1) {
            interesectedArr = arraysToIntersect[0];
            for (let j = 1; j < numOfArraysToIntersect; j++) {
                interesectedArr = this.helper.intersect(interesectedArr, arraysToIntersect[j], requiredFields);
            }
        }
        return interesectedArr;
    }
    queryOR(requiredFields, objectArr, countNot, datasets) {
        let arraysToUnion = [];
        let UnionedArr = [];
        let IntersectedArr = [];
        const numOfObjects = objectArr.length;
        let isNot = true;
        if (countNot % 2 === 0) {
            isNot = false;
        }
        for (let i = 0; i < numOfObjects; i++) {
            let result = [];
            let obj = objectArr[i];
            for (let key in obj) {
                if (QueryChecker_1.default.SCOMPARATOR === key) {
                    result = this.querySCOMP(requiredFields, obj[key], isNot, datasets);
                }
                else if (QueryChecker_1.default.MCOMPARATOR.includes(key)) {
                    result = this.queryMCOMP(key, requiredFields, obj[key], isNot, datasets);
                }
                else if (QueryChecker_1.default.NEGATION === key) {
                    countNot++;
                    result = this.queryNEG(requiredFields, obj[key], countNot, datasets);
                }
                else if (QueryChecker_1.default.LOGIC.includes(key)) {
                    result = this.queryLOGIC(key, requiredFields, obj[key], countNot, datasets);
                }
            }
            arraysToUnion.push(result);
        }
        const numOfArraysToUnion = arraysToUnion.length;
        UnionedArr = arraysToUnion[0];
        IntersectedArr = arraysToUnion[0];
        if (numOfArraysToUnion > 1) {
            for (let i = 1; i < numOfArraysToUnion; i++) {
                IntersectedArr = this.helper.intersect(UnionedArr, arraysToUnion[i], requiredFields);
                UnionedArr = UnionedArr.concat(arraysToUnion[i]);
                if (IntersectedArr.length > 0) {
                    UnionedArr = this.helper.union(UnionedArr, IntersectedArr, requiredFields);
                }
            }
        }
        return UnionedArr;
    }
    queryNEG(requiredFields, object, countNot, datasets) {
        let results = [];
        let isNot = true;
        if (countNot % 2 === 0) {
            isNot = false;
        }
        for (let key in object) {
            if (QueryChecker_1.default.SCOMPARATOR === key) {
                results = this.querySCOMP(requiredFields, object[key], isNot, datasets);
            }
            else if (QueryChecker_1.default.MCOMPARATOR.includes(key)) {
                results = this.queryMCOMP(key, requiredFields, object[key], isNot, datasets);
            }
            else if (QueryChecker_1.default.NEGATION === key) {
                countNot++;
                results = this.queryNEG(requiredFields, object[key], countNot, datasets);
            }
            else if (QueryChecker_1.default.LOGIC.includes(key)) {
                results = this.queryLOGIC(key, requiredFields, object[key], countNot, datasets);
            }
        }
        return results;
    }
    queryMCOMP(MComparator, requiredFields, object, isNot, datasets) {
        let mfield;
        let datasetEntry;
        let value;
        let result = [];
        for (let key in object) {
            const arr = key.split("_");
            datasetEntry = datasets.get(arr[0]);
            mfield = arr[1];
            value = object[key];
        }
        let dataset = datasetEntry.content;
        const rFields = this.helper.getOnlyFields(requiredFields);
        const numOfSections = datasetEntry.header.numRows;
        switch (MComparator) {
            case "LT":
                this.queryLT(numOfSections, dataset, mfield, value, requiredFields, rFields, result, isNot);
                break;
            case "EQ":
                this.queryEQ(numOfSections, dataset, mfield, value, requiredFields, rFields, result, isNot);
                break;
            case "GT":
                this.queryGT(numOfSections, dataset, mfield, value, requiredFields, rFields, result, isNot);
                break;
        }
        return result;
    }
    queryGT(numOfSections, dataset, mfield, value, requiredFields, rFields, result, isNot) {
        const numOfFields = rFields.length;
        for (let i = 0; i < numOfSections; i++) {
            const section = dataset[i];
            let isNotGT;
            if (isNot) {
                isNotGT = section[mfield] <= value;
            }
            else {
                isNotGT = section[mfield] > value;
            }
            if (isNotGT) {
                let obj = {};
                for (let j = 0; j < numOfFields; j++) {
                    obj[requiredFields[j]] = section[rFields[j]];
                }
                result.push(obj);
            }
        }
    }
    queryEQ(numOfSections, dataset, mfield, value, requiredFields, rFields, result, isNot) {
        const numOfFields = rFields.length;
        for (let i = 0; i < numOfSections; i++) {
            const section = dataset[i];
            let isNotEQ;
            if (isNot) {
                isNotEQ = section[mfield] !== value;
            }
            else {
                isNotEQ = section[mfield] === value;
            }
            if (isNotEQ) {
                let obj = {};
                for (let j = 0; j < numOfFields; j++) {
                    obj[requiredFields[j]] = section[rFields[j]];
                }
                result.push(obj);
            }
        }
    }
    queryLT(numOfSections, dataset, mfield, value, requiredFields, rFields, result, isNot) {
        const numOfFields = rFields.length;
        for (let i = 0; i < numOfSections; i++) {
            const section = dataset[i];
            let isNotLT;
            if (isNot) {
                isNotLT = section[mfield] >= value;
            }
            else {
                isNotLT = section[mfield] < value;
            }
            if (isNotLT) {
                let obj = {};
                for (let j = 0; j < numOfFields; j++) {
                    obj[requiredFields[j]] = section[rFields[j]];
                }
                result.push(obj);
            }
        }
    }
    querySCOMP(requiredFields, object, isNot, datasets) {
        let sfield;
        let datasetEntry;
        let value;
        let result = [];
        for (let key in object) {
            const arr = key.split("_");
            datasetEntry = datasets.get(arr[0]);
            sfield = arr[1];
            value = object[key];
        }
        let dataset = datasetEntry.content;
        const rFields = this.helper.getOnlyFields(requiredFields);
        const numOfSections = datasetEntry.header.numRows;
        this.queryIS(numOfSections, dataset, sfield, value, requiredFields, rFields, result, isNot);
        return result;
    }
    queryIS(numOfSections, dataset, sfield, value, requiredFields, rFields, result, isNot) {
        const numOfFields = rFields.length;
        for (let i = 0; i < numOfSections; i++) {
            const section = dataset[i];
            let isNotIS;
            const sectionValue = section[sfield];
            let regex = value;
            regex = regex.replace(/\*/g, ".*");
            regex = "^" + regex + "$";
            const reg = new RegExp(regex);
            if (isNot) {
                isNotIS = !reg.test(sectionValue);
            }
            else {
                isNotIS = reg.test(sectionValue);
            }
            if (isNotIS) {
                let obj = {};
                for (let j = 0; j < numOfFields; j++) {
                    obj[requiredFields[j]] = section[rFields[j]];
                }
                result.push(obj);
            }
        }
    }
}
exports.default = QueryPerformer;
//# sourceMappingURL=QueryPerformer.js.map