import {DatasetEntry} from "./InsightFacade";
import Log from "../Util";
import {InsightDatasetKind} from "./IInsightFacade";
import QueryChecker from "./QueryChecker";

export default class QueryValidator {

    public checkID(id: any): string {
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

    public isValidApplyKey(key: any): boolean {
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

    public compareOrSetId(id: string): boolean {
        if (!this.checkID(id)) {
            if (QueryChecker.idstring === "") {
                QueryChecker.idstring = id;
                let dataset: DatasetEntry = QueryChecker.datasets.get(id);
                if (dataset === undefined) {
                    Log.trace("the dataset with id: " + id + " does not exist.");
                    return false;
                }
                QueryChecker.type = dataset.header.kind;
                Log.trace("Changed idstring to " + id);
            } else if (QueryChecker.idstring !== id) {
                Log.trace("Different idstring");
                return false;
            }
        } else {
            Log.trace("Incorrect idstring format");
            return false;
        }
        return true;
    }

    public mcomparatorCheck(comparator: any): boolean {
        for (let comparisonString in comparator) {
            Log.trace("Checking " + comparisonString);
            let wordParts = comparisonString.split("_");
            if (wordParts.length !== 2) {
                Log.trace(comparisonString + " didn't have two parts");
                return false;
            }
            if (!this.compareOrSetId(wordParts[0])) {
                return false;
            }
            if (!this.isInMfield(wordParts[1])) {
                Log.trace("Not a valid mfield");
                return false;
            }
            if (typeof comparator[comparisonString] !== "number" || comparator[comparisonString] === null) {
                Log.trace("Not mcomparing with a number");
                return false;
            }
        }
        return true;
    }

    public scomparatorCheck(comparator: any): boolean {
        const validInputstring = /^[*]?[^*]*[*]?$/gm;
        if (Object.keys(comparator).length !== 1) {
            Log.trace("Multiple scomparators");
            return false;
        }
        for (let comparisonString in comparator) {
            Log.trace("Checking scomparison " + comparisonString);
            let wordParts = comparisonString.split("_");
            if (wordParts.length !== 2) {
                Log.trace("Incorrect comparison string");
                return false;
            }
            if (!this.compareOrSetId(wordParts[0])) {
                return false;
            }
            if (!this.isInSfield(wordParts[1])) {
                Log.trace("Not a valid sfield");
                return false;
            }
            if (comparator[comparisonString] === null || typeof comparator[comparisonString] !== "string") {
                Log.trace(comparator[comparisonString] + " not a valid string");
                return false;
            }
            if (!validInputstring.test(comparator[comparisonString])) {
                Log.trace("Not a valid comparison string " + comparator[comparisonString]);
                return false;
            }
        }
        return true;
    }


    public isValidKey(check: any, mfield: boolean, sfield: boolean): boolean {
        if (!(typeof check === "string")) {
            return false;
        }
        Log.trace("Checking option " + check);
        let wordParts = check.split("_");
        if (wordParts.length !== 2) {
            Log.trace("Incorrect option string " + check);
            return false;
        }
        if (!this.compareOrSetId(wordParts[0])) {
            return false;
        }
        if (mfield && sfield) {
            if (!this.isInMfield(wordParts[1]) && !this.isInSfield(wordParts[1])) {
                Log.trace("Invalid column or sort option " + wordParts[1]);
                return false;
            }
        } else if (mfield) {
            if (!this.isInMfield(wordParts[1])) {
                return false;
            }
        } else if (sfield) {
            if (!this.isInSfield(wordParts[1])) {
                return false;
            }
        }
        return true;
    }

    public isInSfield(field: string): boolean {
        if (QueryChecker.type === InsightDatasetKind.Courses) {
            return QueryChecker.SFIELDCOURSES.includes(field);
        }
        if (QueryChecker.type === InsightDatasetKind.Rooms) {
            return QueryChecker.SFIELDROOMS.includes(field);
        }
        return false;
    }

    public isInMfield(field: string): boolean {
        if (QueryChecker.type === InsightDatasetKind.Courses) {
            return QueryChecker.MFIELDCOURSES.includes(field);
        }
        if (QueryChecker.type === InsightDatasetKind.Rooms) {
            return QueryChecker.MFIELDROOMS.includes(field);
        }
        return false;
    }

    public isDirValid(direction: any): boolean {
        if (typeof direction !== "string") {
            return false;
        }
        if (!QueryChecker.DIRECTION.includes(direction)) {
            return false;
        }
        return true;
    }

    public isKeysValid(keys: any, options: any): boolean {
        if (!Array.isArray(keys)) {
            Log.trace("Invalid type of keys in ORDER");
            return false;
        }
        if (keys.length === 0) {
            Log.trace("keys in ORDER must be a non-empty array");
            return false;
        }
        for (let key of keys) {
            if (typeof key !== "string") {
                Log.trace("Invalid key in keys in ORDER");
                return false;
            }
            if (!options.COLUMNS.includes(key)) {
                Log.trace("keys in ORDER must be in COLUMNS");
                return false;
            }
        }
        return true;
    }

    public containsAllKeys(group: any[]): boolean {
        const groupSize: number = group.length;
        for (let i = 0; i < groupSize; i++) {
            const element: any = group[i];
            if (!this.isValidKey(element, true, true)) {
                return false;
            }
        }
        return true;
    }

    public isValidApplyKeyInToken(applyToken: string, key: any) {
        if (applyToken === "COUNT") {
            if (!this.isValidKey(key, true, true)) {
                return false;
            }
        } else {
            if (!this.isValidKey(key, true, false)) {
                return false;
            }
        }
        return true;
    }

    public isObject(object: any): boolean {
        if (!object || !(typeof object === "object") || !(object.constructor === ({}).constructor)) {
            return false;
        }
        return true;
    }

}
