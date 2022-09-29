"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
class QueryHelper {
    setIdentifierField(id, datasets) {
        if (datasets.get(id).header.kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
            return id + "_" + "name";
        }
        if (datasets.get(id).header.kind === IInsightFacade_1.InsightDatasetKind.Courses) {
            return id + "_" + "uuid";
        }
    }
    setRequiredFields(isTransformation, query, requiredFields, id) {
        if (isTransformation) {
            let group = query.TRANSFORMATIONS.GROUP;
            let apply = query.TRANSFORMATIONS.APPLY;
            let applyFields = this.getApplyKeys(apply);
            requiredFields = this.removeApplyFields(requiredFields, id);
            requiredFields = this.mergeFields(requiredFields, group);
            requiredFields = this.mergeFields(requiredFields, applyFields);
        }
        return requiredFields;
    }
    setId(isTransformation, query, requiredFields) {
        let id;
        if (isTransformation) {
            let group = query.TRANSFORMATIONS.GROUP;
            let apply = query.TRANSFORMATIONS.APPLY;
            let applyFields = this.getApplyKeys(apply);
            id = this.retrieveId(requiredFields, group, applyFields);
        }
        else {
            id = this.retrieveId(requiredFields, [], []);
        }
        return id;
    }
    retrieveId(requiredFields, group, applyFields) {
        const sizeOfColumns = requiredFields.length;
        const sizeOfGroup = group.length;
        const sizeOfApplyFields = applyFields.length;
        for (let i = 0; i < sizeOfColumns; i++) {
            const arr = requiredFields[i].split("_");
            if (arr.length === 2) {
                return arr[0];
            }
        }
        for (let i = 0; i < sizeOfGroup; i++) {
            const arr = group[i].split("_");
            if (arr.length === 2) {
                return arr[0];
            }
        }
        for (let i = 0; i < sizeOfApplyFields; i++) {
            const arr = applyFields[i].split("_");
            if (arr.length === 2) {
                return arr[0];
            }
        }
    }
    removeApplyFields(requiredFields, id) {
        const numOfFields = requiredFields.length;
        let result = [];
        for (let i = 0; i < numOfFields; i++) {
            let valid = true;
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
    mergeFields(requiredFields, group) {
        const numOfFieldsG = group.length;
        const numOfFieldsR = requiredFields.length;
        let result = [].concat(requiredFields);
        for (let i = 0; i < numOfFieldsG; i++) {
            let match = false;
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
    addRequiredFields(requiredFields, id, datasets) {
        let results = [];
        const numOfCourses = datasets.get(id).header.numRows;
        const dataset = datasets.get(id).content;
        const numOfRequiredFields = requiredFields.length;
        const rFields = this.getOnlyFields(requiredFields);
        for (let i = 0; i < numOfCourses; i++) {
            const course = dataset[i];
            let obj = {};
            for (let j = 0; j < numOfRequiredFields; j++) {
                obj[requiredFields[j]] = course[rFields[j]];
            }
            results.push(obj);
        }
        return results;
    }
    getOnlyFields(fields) {
        let result = [];
        let size = fields.length;
        for (let i = 0; i < size; i++) {
            const arr = fields[i].split("_");
            result[i] = arr[1];
        }
        return result;
    }
    removeIdentifier(key, results) {
        const numOfSectionsInResult = results.length;
        for (let i = 0; i < numOfSectionsInResult; i++) {
            delete results[i][key];
        }
    }
    deleteAtIndex(array, index) {
        let sizeOfArray = array.length;
        let arr1 = array.slice(0, index);
        let arr2 = array.slice(index + 1, sizeOfArray);
        array = arr1.concat(arr2);
        return array;
    }
    getApplyKeys(apply) {
        let results = [];
        const sizeOfApply = apply.length;
        for (let i = 0; i < sizeOfApply; i++) {
            let object = apply[i];
            for (let applyKey in object) {
                let obj = object[applyKey];
                for (let applyToken in obj) {
                    let key = obj[applyToken];
                    results.push(key);
                }
            }
        }
        return results;
    }
    OnlyIncludeColumnFields(sets, columnFields) {
        const sizeOfSets = sets.length;
        const sizeOfColumnFields = columnFields.length;
        let result = [];
        for (let i = 0; i < sizeOfSets; i++) {
            let set = sets[i];
            let entry = {};
            for (let j = 0; j < sizeOfColumnFields; j++) {
                const field = columnFields[j];
                entry[field] = set[field];
            }
            result.push(entry);
        }
        return result;
    }
    getTransformationKeys(transformations) {
        const groupKeys = transformations.GROUP;
        let applyKeys = [];
        let apply = transformations.APPLY;
        const sizeOfApply = apply.length;
        for (let i = 0; i < sizeOfApply; i++) {
            let applyRule = apply[i];
            for (let key in applyRule) {
                applyKeys.push(key);
            }
        }
        return groupKeys.concat(applyKeys);
    }
    intersect(array1, array2, requiredFields) {
        const numOfElementsIn1 = array1.length;
        const numOfElementsIn2 = array2.length;
        let result = [];
        const numOfRequiredFields = requiredFields.length;
        for (let i = 0; i < numOfElementsIn1; i++) {
            const Obj1 = array1[i];
            let found = false;
            for (let j = 0; j < numOfElementsIn2; j++) {
                const Obj2 = array2[j];
                for (let k = 0; k < numOfRequiredFields; k++) {
                    if (Obj1[requiredFields[k]] === Obj2[requiredFields[k]]) {
                        found = true;
                    }
                    else {
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
    union(array, removeArr, requiredFields) {
        const sizeOfRemoveArr = removeArr.length;
        const numOfRequiredFields = requiredFields.length;
        for (let i = 0; i < sizeOfRemoveArr; i++) {
            let sizeOfArray = array.length;
            const obj1 = removeArr[i];
            for (let j = 0; j < sizeOfArray; j++) {
                const obj2 = array[j];
                let match = true;
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
exports.default = QueryHelper;
//# sourceMappingURL=QueryHelper.js.map