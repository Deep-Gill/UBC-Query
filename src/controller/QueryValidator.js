"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("../Util");
const IInsightFacade_1 = require("./IInsightFacade");
const QueryChecker_1 = require("./QueryChecker");
class QueryValidator {
    checkID(id) {
        if (id === null || id === undefined) {
            return "ID cannot be null or undefined.";
        }
        if (!(typeof id === "string")) {
            return "ID must be a string";
        }
        if (id === "") {
            return "ID must not be an empty string";
        }
        const regexToReject = /((.*_.*)|(^\s+$))/gm;
        if (regexToReject.test(id)) {
            return "Illegal ID (underscore or whitespace only).";
        }
        return null;
    }
    isValidApplyKey(key) {
        if (key === null || key === undefined) {
            return false;
        }
        if (!(typeof key === "string")) {
            return false;
        }
        if (key === "") {
            return false;
        }
        const regexToReject = /((.*_.*))/gm;
        if (regexToReject.test(key)) {
            return false;
        }
        return true;
    }
    compareOrSetId(id) {
        if (!this.checkID(id)) {
            if (QueryChecker_1.default.idstring === "") {
                QueryChecker_1.default.idstring = id;
                let dataset = QueryChecker_1.default.datasets.get(id);
                if (dataset === undefined) {
                    Util_1.default.trace("the dataset with id: " + id + " does not exist.");
                    return false;
                }
                QueryChecker_1.default.type = dataset.header.kind;
                Util_1.default.trace("Changed idstring to " + id);
            }
            else if (QueryChecker_1.default.idstring !== id) {
                Util_1.default.trace("Different idstring");
                return false;
            }
        }
        else {
            Util_1.default.trace("Incorrect idstring format");
            return false;
        }
        return true;
    }
    mcomparatorCheck(comparator) {
        for (let comparisonString in comparator) {
            Util_1.default.trace("Checking " + comparisonString);
            let wordParts = comparisonString.split("_");
            if (wordParts.length !== 2) {
                Util_1.default.trace(comparisonString + " didn't have two parts");
                return false;
            }
            if (!this.compareOrSetId(wordParts[0])) {
                return false;
            }
            if (!this.isInMfield(wordParts[1])) {
                Util_1.default.trace("Not a valid mfield");
                return false;
            }
            if (typeof comparator[comparisonString] !== "number" || comparator[comparisonString] === null) {
                Util_1.default.trace("Not mcomparing with a number");
                return false;
            }
        }
        return true;
    }
    scomparatorCheck(comparator) {
        const validInputstring = /^[*]?[^*]*[*]?$/gm;
        if (Object.keys(comparator).length !== 1) {
            Util_1.default.trace("Multiple scomparators");
            return false;
        }
        for (let comparisonString in comparator) {
            Util_1.default.trace("Checking scomparison " + comparisonString);
            let wordParts = comparisonString.split("_");
            if (wordParts.length !== 2) {
                Util_1.default.trace("Incorrect comparison string");
                return false;
            }
            if (!this.compareOrSetId(wordParts[0])) {
                return false;
            }
            if (!this.isInSfield(wordParts[1])) {
                Util_1.default.trace("Not a valid sfield");
                return false;
            }
            if (comparator[comparisonString] === null || typeof comparator[comparisonString] !== "string") {
                Util_1.default.trace(comparator[comparisonString] + " not a valid string");
                return false;
            }
            if (!validInputstring.test(comparator[comparisonString])) {
                Util_1.default.trace("Not a valid comparison string " + comparator[comparisonString]);
                return false;
            }
        }
        return true;
    }
    isValidKey(check, mfield, sfield) {
        if (!(typeof check === "string")) {
            return false;
        }
        Util_1.default.trace("Checking option " + check);
        let wordParts = check.split("_");
        if (wordParts.length !== 2) {
            Util_1.default.trace("Incorrect option string " + check);
            return false;
        }
        if (!this.compareOrSetId(wordParts[0])) {
            return false;
        }
        if (mfield && sfield) {
            if (!this.isInMfield(wordParts[1]) && !this.isInSfield(wordParts[1])) {
                Util_1.default.trace("Invalid column or sort option " + wordParts[1]);
                return false;
            }
        }
        else if (mfield) {
            if (!this.isInMfield(wordParts[1])) {
                return false;
            }
        }
        else if (sfield) {
            if (!this.isInSfield(wordParts[1])) {
                return false;
            }
        }
        return true;
    }
    isInSfield(field) {
        if (QueryChecker_1.default.type === IInsightFacade_1.InsightDatasetKind.Courses) {
            return QueryChecker_1.default.SFIELDCOURSES.includes(field);
        }
        if (QueryChecker_1.default.type === IInsightFacade_1.InsightDatasetKind.Rooms) {
            return QueryChecker_1.default.SFIELDROOMS.includes(field);
        }
        return false;
    }
    isInMfield(field) {
        if (QueryChecker_1.default.type === IInsightFacade_1.InsightDatasetKind.Courses) {
            return QueryChecker_1.default.MFIELDCOURSES.includes(field);
        }
        if (QueryChecker_1.default.type === IInsightFacade_1.InsightDatasetKind.Rooms) {
            return QueryChecker_1.default.MFIELDROOMS.includes(field);
        }
        return false;
    }
    isDirValid(direction) {
        if (typeof direction !== "string") {
            return false;
        }
        if (!QueryChecker_1.default.DIRECTION.includes(direction)) {
            return false;
        }
        return true;
    }
    isKeysValid(keys, options) {
        if (!Array.isArray(keys)) {
            Util_1.default.trace("Invalid type of keys in ORDER");
            return false;
        }
        if (keys.length === 0) {
            Util_1.default.trace("keys in ORDER must be a non-empty array");
            return false;
        }
        for (let key of keys) {
            if (typeof key !== "string") {
                Util_1.default.trace("Invalid key in keys in ORDER");
                return false;
            }
            if (!options.COLUMNS.includes(key)) {
                Util_1.default.trace("keys in ORDER must be in COLUMNS");
                return false;
            }
        }
        return true;
    }
    containsAllKeys(group) {
        const groupSize = group.length;
        for (let i = 0; i < groupSize; i++) {
            const element = group[i];
            if (!this.isValidKey(element, true, true)) {
                return false;
            }
        }
        return true;
    }
    isValidApplyKeyInToken(applyToken, key) {
        if (applyToken === "COUNT") {
            if (!this.isValidKey(key, true, true)) {
                return false;
            }
        }
        else {
            if (!this.isValidKey(key, true, false)) {
                return false;
            }
        }
        return true;
    }
    isObject(object) {
        if (!object || !(typeof object === "object") || !(object.constructor === ({}).constructor)) {
            return false;
        }
        return true;
    }
}
exports.default = QueryValidator;
//# sourceMappingURL=QueryValidator.js.map