import Log from "../Util";
import {InsightDatasetKind} from "./IInsightFacade";
import InsightFacade, {DatasetEntry} from "./InsightFacade";
import QueryValidator from "./QueryValidator";
import QueryHelper from "./QueryHelper";
import has = Reflect.has;

export default class QueryChecker {
	public static OPTIONS: string[] = ["COLUMNS", "ORDER"];
	public static TRANSFORMATIONS: string[] = ["GROUP", "APPLY"];
	public static LOGIC: string[] = ["AND", "OR"];
	public static MCOMPARATOR: string[] = ["LT", "GT", "EQ"];
	public static SCOMPARATOR: string = "IS";
	public static NEGATION: string = "NOT";
	public static APPLYTOKEN: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
	public static DIRECTION: string[] = ["UP", "DOWN"];
	public static MFIELDCOURSES: string[] = ["avg", "pass", "fail", "audit", "year"];
	public static SFIELDCOURSES: string[] = ["dept", "id", "instructor", "title", "uuid"];
	public static MFIELDROOMS: string[] = ["lat", "lon", "seats"];
	public static SFIELDROOMS: string[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture",
                                       "href"];

	public static idstring: string = "";
	public static datasets: Map<string, DatasetEntry>;
	public static type: InsightDatasetKind;
	private static validator: QueryValidator = new QueryValidator();
	private static helper: QueryHelper = new QueryHelper();

    public static checkQueryValidity(query: any, datasets: any): boolean {
        this.idstring = "";
        this.datasets = datasets;
        this.type = null;

        if (!query.hasOwnProperty("WHERE") || !query.hasOwnProperty("OPTIONS")) {
            Log.trace("Missing WHERE or OPTIONS");
            return false;
        }

        if ((Object.keys(query).length === 3) && !(query.hasOwnProperty("TRANSFORMATIONS"))) {
            Log.trace("Excess keys in query");
            return false;
        }

        if (Object.keys(query).length > 3) {
            Log.trace("Excess keys in query");
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


    private static checkWhere(where: any): boolean {
	    if (Object.keys(where).length !== 1) {
	        return false;
	    }

	    for (let check in where) {
	         if (QueryChecker.LOGIC.includes(check)) {
	             return where[check].every(QueryChecker.checkWhere);
	         }
	         if (QueryChecker.MCOMPARATOR.includes(check)) {
	             Log.trace("Checking MCOMPARATOR");
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

	private static checkOptions(options: any, query: any): boolean {
        if (Object.keys(options).length > 2 || Object.keys(options).length === 0) {
            Log.trace("OPTIONS formatted incorrectly");
            return false;
        }

        if (Object.keys(options).length === 1 && !options.hasOwnProperty("COLUMNS")) {
            Log.trace("OPTIONS missing columns");
            return false;
        }

        if (Object.keys(options).length === 2 && !(options.hasOwnProperty("COLUMNS") &&
            options.hasOwnProperty("ORDER"))) {
            Log.trace("OPTIONS has field other than COLUMNS and ORDER");
            return false;
        }
        let transformationsKeys: string[] = [];
        let hasTransformations: boolean = query.hasOwnProperty("TRANSFORMATIONS");
        if (hasTransformations) {
            transformationsKeys = this.helper.getTransformationKeys(query.TRANSFORMATIONS);
        }
        for (let check in options) {
			Log.trace("Checking " + check);
			if (check === "COLUMNS") {
                let columns: any = options.COLUMNS;
                if (!QueryChecker.checkColumns(columns, hasTransformations, transformationsKeys)) {
                    return false;
                }
			} else if (check === "ORDER") {
			    let order: any = options[check];
			    if (!QueryChecker.checkOrder(order, options, hasTransformations)) {
			        return false;
                }
			} else {
				Log.trace("Unknown key in options");
				return false;
			}
		}
        return true;
	}

	private static checkColumns(columns: any, hasTransformations: boolean, transformationKeys: string[]): boolean {
	    if (!Array.isArray(columns)) {
	        Log.trace("Invalid COLUMNS type");
	        return false;
        }
	    if (columns.length === 0) {
	        Log.trace("No COLUMNS keys");
	        return false;
	    }
	    for (let key of columns) {
	        if (typeof key !== "string") {
                Log.trace("Invalid value in COLUMNS");
                return false;
            }
	        if (hasTransformations) {
	            if (!transformationKeys.includes(key)) {
	                Log.trace("COLUMNS must contain keys from GROUP or APPLY");
	                return false;
	            }
	        } else {
	            if (!this.validator.isValidKey(key, true, true)) {
	                Log.trace("Invalid value in COLUMNS");
	                return false;
	            }
	        }
	    }
	    return true;
    }

	private static checkOrder(order: any, options: any, hasTransformations: boolean): boolean {
        if (typeof order !== "string" && !this.validator.isObject(order)) {
            Log.trace("Invalid ORDER type");
            return false;
        }
        if (typeof order === "string") {
            if (!options.COLUMNS.includes(order)) {
                Log.trace("Invalid ORDER key");
                return false;
            }
            if (hasTransformations) {
                return true;
            } else {
                return this.validator.isValidKey(order, true, true);
            }
        } else if (this.validator.isObject(order)) {
            if (Object.keys(order).length !== 2) {
                Log.trace("Either excess keys or missing dir or keys in ORDER");
                return false;
            }
            if (!(order.hasOwnProperty("dir") && order.hasOwnProperty("keys"))) {
                Log.trace("Missing dir or keys in ORDER");
                return false;
            }
            const direction: any = order.dir;
            if (!this.validator.isDirValid(direction)) {
                Log.trace("Invalid dir in ORDER");
                return false;
            }
            const keys: any = order.keys;
            if (!this.validator.isKeysValid(keys, options)) {
                return false;
            }
        }
        return true;
    }

    private static checkTransformations(transformations: any): boolean {
	    if (transformations === undefined) {
	        return true;
        }
	    if (!this.validator.isObject(transformations)) {
	        Log.trace("TRANSFORMATIONS must be an object");
	        return false;
        }
	    if (Object.keys(transformations).length > 2) {
	        Log.trace("Excess keys in Transformations");
	        return false;
        }
	    if (Object.keys(transformations).length !== 2) {
	        Log.trace("TRANSFORMATIONS missing either GROUP or APPLY");
	        return false;
        }
	    if (!(transformations.hasOwnProperty("GROUP") && transformations.hasOwnProperty("APPLY"))) {
	        Log.trace("TRANSFORMATIONS missing either GROUP or APPLY");
	        return false;
        }
	    return (QueryChecker.checkGroup(transformations.GROUP) && QueryChecker.checkApply(transformations.APPLY));
    }

    private static checkGroup(group: any): boolean {
	    if (!Array.isArray(group)) {
	        Log.trace("GROUP must be an array");
	        return false;
        }
	    if (group.length === 0) {
	        Log.trace("GROUP must be a non-empty array");
	        return false;
        }
	    if (!this.validator.containsAllKeys(group)) {
	        Log.trace("GROUP must contain either mkeys or skeys only");
	        return false;
        }
	    return true;
    }

    private static checkApply(apply: any): boolean {
	    if (!Array.isArray(apply)) {
	        return false;
        }
	    const applySize: number = apply.length;
	    for (let i = 0; i < applySize; i++) {
	        const applyRule: any = apply[i];
	        if (!this.validator.isObject(applyRule) || (Object.keys(applyRule).length !== 1)) {
	            return false;
            }
	        for (let applyKey in applyRule) {
	            if (!this.validator.isValidApplyKey(applyKey)) {
	                Log.trace("Invalid applyKey in APPLY");
	                return false;
                }
	            const obj: any = applyRule[applyKey];
	            if (!this.validator.isObject(obj) || (Object.keys(obj).length !== 1)) {
	                return false;
                }
	            for (let applyToken in obj) {
	                if (!(typeof applyToken === "string") || !QueryChecker.APPLYTOKEN.includes(applyToken)) {
                        Log.trace("Invalid applyToken in APPLY");
                        return false;
                    }
	                const key: any = obj[applyToken];
	                if (!this.validator.isValidApplyKeyInToken(applyToken, key)) {
                        Log.trace("Invalid key in applyToken in APPLY");
                        return false;
                    }
                }
            }
        }
	    return true;
    }

}
