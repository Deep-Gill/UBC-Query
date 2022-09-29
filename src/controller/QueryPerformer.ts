import QueryChecker from "./QueryChecker";
import QueryHelper from "./QueryHelper";
import { DatasetEntry } from "./InsightFacade";
import {
    SectionData,
    RoomData,
    Data
} from "./DatasetProcessor";

export default class QueryPerformer {
    private helper = new QueryHelper();

    public queryLOGIC(Logic: string, requiredFields: string[], objectArr: any[], countNot: number, datasets?: any):
        any[] {
        let results: any[] = [];
        let isNot: boolean = true;
        if (countNot % 2 === 0) {
            isNot = false;
        }
        switch (Logic) {
            case "AND":
                if (isNot) {
                    results = this.queryOR(requiredFields, objectArr, countNot, datasets);
                    break;
                } else {
                    results = this.queryAND(requiredFields, objectArr, countNot, datasets);
                    break;
                }
            case "OR":
                if (isNot) {
                    results = this.queryAND(requiredFields, objectArr, countNot, datasets);
                    break;
                } else {
                    results = this.queryOR(requiredFields, objectArr, countNot, datasets);
                    break;
                }
        }
        return results;
    }

    private queryAND(requiredFields: string[], objectArr: any[], countNot: number, datasets?: any): any[] {
        let arraysToIntersect: any[] = [];
        let interesectedArr: any[] = [];
        const numOfObjects: number = objectArr.length;
        let isNot: boolean = true;
        if (countNot % 2 === 0) {
            isNot = false;
        }
        for (let i = 0; i < numOfObjects; i++) {
            let result: any[] = [];
            let obj: any = objectArr[i];
            for (let key in obj) {
                if (QueryChecker.SCOMPARATOR === key) {
                    result = this.querySCOMP(requiredFields, obj[key], isNot, datasets);
                } else if (QueryChecker.MCOMPARATOR.includes(key)) {
                    result = this.queryMCOMP(key, requiredFields, obj[key], isNot, datasets);
                } else if (QueryChecker.NEGATION === key) {
                    countNot++;
                    result = this.queryNEG(requiredFields, obj[key], countNot, datasets);
                } else if (QueryChecker.LOGIC.includes(key)) {
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

    private queryOR(requiredFields: string[], objectArr: any[], countNot: number, datasets?: any): any[] {
        let arraysToUnion: any[] = [];
        let UnionedArr: any[] = [];
        let IntersectedArr: any[] = [];
        const numOfObjects: number = objectArr.length;
        let isNot: boolean = true;
        if (countNot % 2 === 0) {
            isNot = false;
        }
        for (let i = 0; i < numOfObjects; i++) {
            let result: any[] = [];
            let obj: any = objectArr[i];
            for (let key in obj) {
                if (QueryChecker.SCOMPARATOR === key) {
                    result = this.querySCOMP(requiredFields, obj[key], isNot, datasets);
                } else if (QueryChecker.MCOMPARATOR.includes(key)) {
                    result = this.queryMCOMP(key, requiredFields, obj[key], isNot, datasets);
                } else if (QueryChecker.NEGATION === key) {
                    countNot++;
                    result = this.queryNEG(requiredFields, obj[key], countNot, datasets);
                } else if (QueryChecker.LOGIC.includes(key)) {
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

    public queryNEG(requiredFields: string[], object: any, countNot: number, datasets?: any): any[] {
        let results: any[] = [];
        let isNot: boolean = true;
        if (countNot % 2 === 0) {
            isNot = false;
        }
        for (let key in object) {
            if (QueryChecker.SCOMPARATOR === key) {
                results = this.querySCOMP(requiredFields, object[key], isNot, datasets);
            } else if (QueryChecker.MCOMPARATOR.includes(key)) {
                results = this.queryMCOMP(key, requiredFields, object[key], isNot, datasets);
            } else if (QueryChecker.NEGATION === key) {
                countNot++;
                results = this.queryNEG(requiredFields, object[key], countNot, datasets);
            } else if (QueryChecker.LOGIC.includes(key)) {
                results = this.queryLOGIC(key, requiredFields, object[key], countNot, datasets);
            }
        }
        return results;
    }

    public queryMCOMP(MComparator: string, requiredFields: string[], object: any, isNot: boolean, datasets?: any):
        any[] {
        let mfield: string;
        let datasetEntry: DatasetEntry;
        let value: number;
        let result: any[] = [];
        for (let key in object) {
            const arr: string[] = key.split("_");
            datasetEntry = datasets.get(arr[0]);
            mfield = arr[1];
            value = object[key];
        }
        let dataset: Data[] = datasetEntry.content;
        const rFields: string[] = this.helper.getOnlyFields(requiredFields);
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

    private queryGT(numOfSections: number, dataset: Data[], mfield: string, value: number,
                    requiredFields: string[], rFields: string[], result: any[], isNot: boolean) {
        const numOfFields = rFields.length;
        for (let i = 0; i < numOfSections; i++) {
            const section: any = dataset[i];
            let isNotGT: boolean;
            if (isNot) {
                isNotGT = section[mfield] <= value;
            } else {
                isNotGT = section[mfield] > value;
            }
            // (isNot ? (isNotGT = section[mfield] <= value) : (isNotGT = section[mfield] > value));
            if (isNotGT) {
                let obj: any = {};
                for (let j = 0; j < numOfFields; j++) {
                    obj[requiredFields[j]] = section[rFields[j]];
                }
                result.push(obj);
            }
        }
    }

    private queryEQ(numOfSections: number, dataset: Data[], mfield: string, value: number,
                    requiredFields: string[], rFields: string[], result: any[], isNot: boolean) {
        const numOfFields = rFields.length;
        for (let i = 0; i < numOfSections; i++) {
            const section: any = dataset[i];
            let isNotEQ: boolean;
            if (isNot) {
                isNotEQ = section[mfield] !== value;
            } else {
                isNotEQ = section[mfield] === value;
            }
            // (isNot ? (isNotEQ = section[mfield] !== value) : (isNotEQ = section[mfield] === value));
            if (isNotEQ) {
                let obj: any = {};
                for (let j = 0; j < numOfFields; j++) {
                    obj[requiredFields[j]] = section[rFields[j]];
                }
                result.push(obj);
            }
        }
    }

    private queryLT(numOfSections: number, dataset: Data[], mfield: string, value: number,
                    requiredFields: string[], rFields: string[], result: any[], isNot: boolean) {
        const numOfFields = rFields.length;
        for (let i = 0; i < numOfSections; i++) {
            const section: any = dataset[i];
            let isNotLT: boolean;
            if (isNot) {
                isNotLT = section[mfield] >= value;
            } else {
                isNotLT = section[mfield] < value;
            }
            // (isNot ? (isNotLT = section[mfield] >= value) : (isNotLT = section[mfield] < value));
            if (isNotLT) {
                let obj: any = {};
                for (let j = 0; j < numOfFields; j++) {
                    obj[requiredFields[j]] = section[rFields[j]];
                }
                result.push(obj);
            }
        }
    }

    public querySCOMP(requiredFields: string[], object: any, isNot: boolean, datasets?: any): any[] {
        let sfield: string;
        let datasetEntry: DatasetEntry;
        let value: string;
        let result: any[] = [];
        for (let key in object) {
            const arr: string[] = key.split("_");
            datasetEntry = datasets.get(arr[0]);
            sfield = arr[1];
            value = object[key];
        }
        let dataset: Data[] = datasetEntry.content;
        const rFields: string[] = this.helper.getOnlyFields(requiredFields);
        const numOfSections = datasetEntry.header.numRows;
        this.queryIS(numOfSections, dataset, sfield, value, requiredFields, rFields, result, isNot);
        return result;
    }

    private queryIS(numOfSections: number, dataset: Data[], sfield: string, value: string,
                    requiredFields: string[], rFields: string[], result: any[], isNot: boolean) {
        const numOfFields = rFields.length;
        for (let i = 0; i < numOfSections; i++) {
            const section: any = dataset[i];
            let isNotIS: boolean;
            const sectionValue: string = section[sfield];
            let regex: string = value;
            regex = regex.replace(/\*/g, ".*");
            regex = "^" + regex + "$";
            const reg = new RegExp(regex);
            if (isNot) {
                isNotIS = !reg.test(sectionValue);
            } else {
                isNotIS = reg.test(sectionValue);
            }
            // (isNot ? (isNotIS = !reg.test(sectionValue)) : (isNotIS = reg.test(sectionValue)));
            if (isNotIS) {
                let obj: any = {};
                for (let j = 0; j < numOfFields; j++) {
                    obj[requiredFields[j]] = section[rFields[j]];
                }
                result.push(obj);
            }
        }
    }

}
