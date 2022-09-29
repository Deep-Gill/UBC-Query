"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("../Util");
const QueryValidator_1 = require("./QueryValidator");
const QueryHelper_1 = require("./QueryHelper");
class QueryChecker {
    static checkQueryValidity(query, datasets) {
        this.idstring = "";
        this.datasets = datasets;
        this.type = null;
        if (!query.hasOwnProperty("WHERE") || !query.hasOwnProperty("OPTIONS")) {
            Util_1.default.trace("Missing WHERE or OPTIONS");
            return false;
        }
        if ((Object.keys(query).length === 3) && !(query.hasOwnProperty("TRANSFORMATIONS"))) {
            Util_1.default.trace("Excess keys in query");
            return false;
        }
        if (Object.keys(query).length > 3) {
            Util_1.default.trace("Excess keys in query");
            return false;
        }
        if (Object.keys(query.WHERE).length !== 0) {
            if (!QueryChecker.checkWhere(query.WHERE)) {
                return false;
            }
        }
        if (!QueryChecker.checkTransformations(query.TRANSFORMATIONS)) {
            return false;
        }
        if (!QueryChecker.checkOptions(query.OPTIONS, query)) {
            return false;
        }
        return true;
    }
    static checkWhere(where) {
        if (Object.keys(where).length !== 1) {
            return false;
        }
        for (let check in where) {
            if (QueryChecker.LOGIC.includes(check)) {
                return where[check].every(QueryChecker.checkWhere);
            }
            if (QueryChecker.MCOMPARATOR.includes(check)) {
                Util_1.default.trace("Checking MCOMPARATOR");
                return QueryChecker.validator.mcomparatorCheck(where[check]);
            }
            if (check === QueryChecker.SCOMPARATOR) {
                return QueryChecker.validator.scomparatorCheck(where[check]);
            }
            if (check === QueryChecker.NEGATION) {
                return QueryChecker.checkWhere(where[check]);
            }
        }
        return false;
    }
    static checkOptions(options, query) {
        if (Object.keys(options).length > 2 || Object.keys(options).length === 0) {
            Util_1.default.trace("OPTIONS formatted incorrectly");
            return false;
        }
        if (Object.keys(options).length === 1 && !options.hasOwnProperty("COLUMNS")) {
            Util_1.default.trace("OPTIONS missing columns");
            return false;
        }
        if (Object.keys(options).length === 2 && !(options.hasOwnProperty("COLUMNS") &&
            options.hasOwnProperty("ORDER"))) {
            Util_1.default.trace("OPTIONS has field other than COLUMNS and ORDER");
            return false;
        }
        let transformationsKeys = [];
        let hasTransformations = query.hasOwnProperty("TRANSFORMATIONS");
        if (hasTransformations) {
            transformationsKeys = this.helper.getTransformationKeys(query.TRANSFORMATIONS);
        }
        for (let check in options) {
            Util_1.default.trace("Checking " + check);
            if (check === "COLUMNS") {
                let columns = options.COLUMNS;
                if (!QueryChecker.checkColumns(columns, hasTransformations, transformationsKeys)) {
                    return false;
                }
            }
            else if (check === "ORDER") {
                let order = options[check];
                if (!QueryChecker.checkOrder(order, options, hasTransformations)) {
                    return false;
                }
            }
            else {
                Util_1.default.trace("Unknown key in options");
                return false;
            }
        }
        return true;
    }
    static checkColumns(columns, hasTransformations, transformationKeys) {
        if (!Array.isArray(columns)) {
            Util_1.default.trace("Invalid COLUMNS type");
            return false;
        }
        if (columns.length === 0) {
            Util_1.default.trace("No COLUMNS keys");
            return false;
        }
        for (let key of columns) {
            if (typeof key !== "string") {
                Util_1.default.trace("Invalid value in COLUMNS");
                return false;
            }
            if (hasTransformations) {
                if (!transformationKeys.includes(key)) {
                    Util_1.default.trace("COLUMNS must contain keys from GROUP or APPLY");
                    return false;
                }
            }
            else {
                if (!this.validator.isValidKey(key, true, true)) {
                    Util_1.default.trace("Invalid value in COLUMNS");
                    return false;
                }
            }
        }
        return true;
    }
    static checkOrder(order, options, hasTransformations) {
        if (typeof order !== "string" && !this.validator.isObject(order)) {
            Util_1.default.trace("Invalid ORDER type");
            return false;
        }
        if (typeof order === "string") {
            if (!options.COLUMNS.includes(order)) {
                Util_1.default.trace("Invalid ORDER key");
                return false;
            }
            if (hasTransformations) {
                return true;
            }
            else {
                return this.validator.isValidKey(order, true, true);
            }
        }
        else if (this.validator.isObject(order)) {
            if (Object.keys(order).length !== 2) {
                Util_1.default.trace("Either excess keys or missing dir or keys in ORDER");
                return false;
            }
            if (!(order.hasOwnProperty("dir") && order.hasOwnProperty("keys"))) {
                Util_1.default.trace("Missing dir or keys in ORDER");
                return false;
            }
            const direction = order.dir;
            if (!this.validator.isDirValid(direction)) {
                Util_1.default.trace("Invalid dir in ORDER");
                return false;
            }
            const keys = order.keys;
            if (!this.validator.isKeysValid(keys, options)) {
                return false;
            }
        }
        return true;
    }
    static checkTransformations(transformations) {
        if (transformations === undefined) {
            return true;
        }
        if (!this.validator.isObject(transformations)) {
            Util_1.default.trace("TRANSFORMATIONS must be an object");
            return false;
        }
        if (Object.keys(transformations).length > 2) {
            Util_1.default.trace("Excess keys in Transformations");
            return false;
        }
        if (Object.keys(transformations).length !== 2) {
            Util_1.default.trace("TRANSFORMATIONS missing either GROUP or APPLY");
            return false;
        }
        if (!(transformations.hasOwnProperty("GROUP") && transformations.hasOwnProperty("APPLY"))) {
            Util_1.default.trace("TRANSFORMATIONS missing either GROUP or APPLY");
            return false;
        }
        return (QueryChecker.checkGroup(transformations.GROUP) && QueryChecker.checkApply(transformations.APPLY));
    }
    static checkGroup(group) {
        if (!Array.isArray(group)) {
            Util_1.default.trace("GROUP must be an array");
            return false;
        }
        if (group.length === 0) {
            Util_1.default.trace("GROUP must be a non-empty array");
            return false;
        }
        if (!this.validator.containsAllKeys(group)) {
            Util_1.default.trace("GROUP must contain either mkeys or skeys only");
            return false;
        }
        return true;
    }
    static checkApply(apply) {
        if (!Array.isArray(apply)) {
            return false;
        }
        const applySize = apply.length;
        for (let i = 0; i < applySize; i++) {
            const applyRule = apply[i];
            if (!this.validator.isObject(applyRule) || (Object.keys(applyRule).length !== 1)) {
                return false;
            }
            for (let applyKey in applyRule) {
                if (!this.validator.isValidApplyKey(applyKey)) {
                    Util_1.default.trace("Invalid applyKey in APPLY");
                    return false;
                }
                const obj = applyRule[applyKey];
                if (!this.validator.isObject(obj) || (Object.keys(obj).length !== 1)) {
                    return false;
                }
                for (let applyToken in obj) {
                    if (!(typeof applyToken === "string") || !QueryChecker.APPLYTOKEN.includes(applyToken)) {
                        Util_1.default.trace("Invalid applyToken in APPLY");
                        return false;
                    }
                    const key = obj[applyToken];
                    if (!this.validator.isValidApplyKeyInToken(applyToken, key)) {
                        Util_1.default.trace("Invalid key in applyToken in APPLY");
                        return false;
                    }
                }
            }
        }
        return true;
    }
}
exports.default = QueryChecker;
QueryChecker.OPTIONS = ["COLUMNS", "ORDER"];
QueryChecker.TRANSFORMATIONS = ["GROUP", "APPLY"];
QueryChecker.LOGIC = ["AND", "OR"];
QueryChecker.MCOMPARATOR = ["LT", "GT", "EQ"];
QueryChecker.SCOMPARATOR = "IS";
QueryChecker.NEGATION = "NOT";
QueryChecker.APPLYTOKEN = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
QueryChecker.DIRECTION = ["UP", "DOWN"];
QueryChecker.MFIELDCOURSES = ["avg", "pass", "fail", "audit", "year"];
QueryChecker.SFIELDCOURSES = ["dept", "id", "instructor", "title", "uuid"];
QueryChecker.MFIELDROOMS = ["lat", "lon", "seats"];
QueryChecker.SFIELDROOMS = ["fullname", "shortname", "number", "name", "address", "type", "furniture",
    "href"];
QueryChecker.idstring = "";
QueryChecker.validator = new QueryValidator_1.default();
QueryChecker.helper = new QueryHelper_1.default();
//# sourceMappingURL=QueryChecker.js.map