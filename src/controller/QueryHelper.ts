import {InsightDatasetKind} from "./IInsightFacade";

export default class QueryHelper {

    public setIdentifierField(id: string, datasets: any) {
        if (datasets.get(id).header.kind === InsightDatasetKind.Rooms) {
            return id + "_" + "name";
        }
        if (datasets.get(id).header.kind === InsightDatasetKind.Courses) {
            return id + "_" + "uuid";
        }
    }

    public setRequiredFields(isTransformation: boolean, query: any, requiredFields: string[], id: string) {
        if (isTransformation) {
            let group: any = query.TRANSFORMATIONS.GROUP;
            let apply: any = query.TRANSFORMATIONS.APPLY;
            let applyFields: string[] = this.getApplyKeys(apply);
            requiredFields = this.removeApplyFields(requiredFields, id);
            requiredFields = this.mergeFields(requiredFields, group);
            requiredFields = this.mergeFields(requiredFields, applyFields);
        }
        return requiredFields;
    }

    public setId(isTransformation: boolean, query: any, requiredFields: string[]): string {
        let id: string;
        if (isTransformation) {
            let group: any = query.TRANSFORMATIONS.GROUP;
            let apply: any = query.TRANSFORMATIONS.APPLY;
            let applyFields: string[] = this.getApplyKeys(apply);
            id = this.retrieveId(requiredFields, group, applyFields);
        } else {
            id = this.retrieveId(requiredFields, [], []);
        }
        return id;
    }

    public retrieveId(requiredFields: string[], group: string[], applyFields: string[]): string {
        const sizeOfColumns: number = requiredFields.length;
        const sizeOfGroup: number = group.length;
        const sizeOfApplyFields: number = applyFields.length;
        for (let i = 0; i < sizeOfColumns; i++) {
            const arr: string[] = requiredFields[i].split("_");
            if (arr.length === 2) {
                return arr[0];
            }
        }
        for (let i = 0; i < sizeOfGroup; i++) {
            const arr: string[] = group[i].split("_");
            if (arr.length === 2) {
                return arr[0];
            }
        }
        for (let i = 0; i < sizeOfApplyFields; i++) {
            const arr: string[] = applyFields[i].split("_");
            if (arr.length === 2) {
                return arr[0];
            }
        }
    }

    public removeApplyFields(requiredFields: string[], id: string): string[] {
        const numOfFields: number = requiredFields.length;
        let result: string[] = [];
        for (let i = 0; i < numOfFields; i++) {
            let valid: boolean = true;
            let arr = requiredFields[i].split("_");
            if (arr.length !== 2 || (arr[0] !== id)) {
                valid = false;
            }
            if (valid) {
                result.push(requiredFields[i]);
            }
        }
        return result;
    }

    public mergeFields(requiredFields: string[], group: string[]): string[] {
        const numOfFieldsG: number = group.length;
        const numOfFieldsR: number = requiredFields.length;
        let result: string[] = [].concat(requiredFields);
        for (let i = 0; i < numOfFieldsG; i++) {
            let match: boolean = false;
            for (let j = 0; j < numOfFieldsR; j++) {
                if (group[i] === requiredFields[j]) {
                    match = true;
                    break;
                }
            }
            if (!match) {
                result.push(group[i]);
            }
        }
        return result;
    }

    public addRequiredFields(requiredFields: string[], id: string, datasets: any): any[] {
        let results: any[] = [];
        const numOfCourses: number = datasets.get(id).header.numRows;
        const dataset = datasets.get(id).content;
        const numOfRequiredFields: number = requiredFields.length;
        const rFields: string[] = this.getOnlyFields(requiredFields);
        for (let i = 0; i < numOfCourses; i++) {
            const course: any = dataset[i];
            let obj: any = {};
            for (let j = 0; j < numOfRequiredFields; j++) {
                obj[requiredFields[j]] = course[rFields[j]];
            }
            results.push(obj);
        }
        return results;
    }

    public getOnlyFields(fields: string[]): string[] {
        let result: string[] = [];
        let size: number = fields.length;
        for (let i = 0; i < size; i++) {
            const arr: string[] = fields[i].split("_");
            result[i] = arr[1];
        }
        return result;
    }

    public removeIdentifier(key: string, results: any[]) {
        const numOfSectionsInResult: number = results.length;
        for (let i = 0; i < numOfSectionsInResult; i++) {
            delete results[i][key];
        }
    }

    public deleteAtIndex(array: any[], index: number): any[] {
        let sizeOfArray = array.length;
        let arr1 = array.slice(0, index);
        let arr2 = array.slice(index + 1, sizeOfArray);
        array = arr1.concat(arr2);
        return array;
    }

    public getApplyKeys(apply: any[]): string[] {
        let results: string[] = [];
        const sizeOfApply: number = apply.length;
        for (let i = 0; i < sizeOfApply; i++) {
            let object: any = apply[i];
            for (let applyKey in object) {
                let obj: any = object[applyKey];
                for (let applyToken in obj) {
                    let key: string = obj[applyToken];
                    results.push(key);
                }
            }
        }
        return results;
    }

    public OnlyIncludeColumnFields(sets: any[], columnFields: string[]): any[] {
        const sizeOfSets: number = sets.length;
        const sizeOfColumnFields: number = columnFields.length;
        let result: any[] = [];
        for (let i = 0; i < sizeOfSets; i++) {
            let set: any = sets[i];
            let entry: any = {};
            for (let j = 0; j < sizeOfColumnFields; j++) {
                const field = columnFields[j];
                entry[field] = set[field];
            }
            result.push(entry);
        }
        return result;
    }

    public getTransformationKeys(transformations: any): string[] {
        const groupKeys: string[] = transformations.GROUP;
        let applyKeys: string[] = [];
        let apply: any[] = transformations.APPLY;
        const sizeOfApply: number = apply.length;
        for (let i = 0; i < sizeOfApply; i++) {
            let applyRule: any = apply[i];
            for (let key in applyRule) {
                applyKeys.push(key);
            }
        }
        return groupKeys.concat(applyKeys);
    }

    public intersect(array1: any[], array2: any[], requiredFields: string[]): any[] {
        const numOfElementsIn1 = array1.length;
        const numOfElementsIn2 = array2.length;
        let result: any[] = [];
        const numOfRequiredFields = requiredFields.length;
        for (let i = 0; i < numOfElementsIn1; i++) {
            const Obj1: any = array1[i];
            let found = false;
            for (let j = 0; j < numOfElementsIn2; j++) {
                const Obj2: any = array2[j];
                for (let k = 0; k < numOfRequiredFields; k++) {
                    if (Obj1[requiredFields[k]] === Obj2[requiredFields[k]]) {
                        found = true;
                    } else {
                        found = false;
                        break;
                    }
                }
                if (found) {
                    break;
                }
            }
            if (found) {
                result.push(Obj1);
            }
        }
        return result;
    }

    public union(array: any[], removeArr: any[], requiredFields: string[]): any[] {
        const sizeOfRemoveArr: number = removeArr.length;
        const numOfRequiredFields: number = requiredFields.length;
        for (let i = 0; i < sizeOfRemoveArr; i++) {
            let sizeOfArray: number = array.length;
            const obj1: any = removeArr[i];
            for (let j = 0; j < sizeOfArray; j++) {
                const obj2: any = array[j];
                let match: boolean = true;
                for (let k = 0; k < numOfRequiredFields; k++) {
                    if (obj1[requiredFields[k]] !== obj2[requiredFields[k]]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    let arr1 = array.slice(0, j);
                    let arr2 = array.slice(j + 1, sizeOfArray);
                    array = arr1.concat(arr2);
                    break;
                }
            }
        }
        return array;
    }

}
