"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const QueryHelper_1 = require("./QueryHelper");
const QuerySorter_1 = require("./QuerySorter");
class QueryTransformer {
    constructor() {
        this.helper = new QueryHelper_1.default();
        this.sorter = new QuerySorter_1.default();
    }
    queryTRANSFORMATIONS(data, transformations, columnFields) {
        const group = transformations.GROUP;
        const apply = transformations.APPLY;
        let sets = this.queryGROUP(data, group);
        let representatives = this.getRepresentativesFromEachSet(sets);
        representatives = this.queryAPPLY(sets, representatives, apply);
        let result = this.helper.OnlyIncludeColumnFields(representatives, columnFields);
        return result;
    }
    queryGROUP(data, group) {
        let sets = [];
        sets.push(data);
        const sizeOfGroups = group.length;
        for (let i = 0; i < sizeOfGroups; i++) {
            let results = [];
            const key = group[i];
            let sizeOfSets = sets.length;
            for (let j = 0; j < sizeOfSets; j++) {
                let set = this.groupByKey(sets[j], key);
                results = results.concat(set);
            }
            sets = results;
        }
        return sets;
    }
    groupByKey(data, key) {
        let sets = [];
        let keys = [];
        keys.push(key);
        let tempArray = [].concat(data);
        this.sorter.sortByKey(tempArray, keys, true);
        const sizeOfData = tempArray.length;
        let i = 0;
        while (i < sizeOfData) {
            let entry = [];
            let initialValue = tempArray[i][key];
            while (tempArray[i][key] === initialValue) {
                entry.push(tempArray[i]);
                i++;
                if (i === sizeOfData) {
                    break;
                }
            }
            sets.push(entry);
        }
        return sets;
    }
    queryAPPLY(sets, representatives, apply) {
        const sizeOfApply = apply.length;
        for (let i = 0; i < sizeOfApply; i++) {
            const object = apply[i];
            for (let applyKey in object) {
                let obj = object[applyKey];
                for (let applyToken in obj) {
                    let key = obj[applyToken];
                    representatives = this.ApplyToken(applyKey, applyToken, key, sets, representatives);
                }
            }
        }
        return representatives;
    }
    ApplyToken(applyKey, applyToken, key, sets, representatives) {
        const sizeOfSets = sets.length;
        for (let i = 0; i < sizeOfSets; i++) {
            let set = sets[i];
            let representative = representatives[i];
            switch (applyToken) {
                case "MAX":
                    representatives[i] = this.MAX(set, representative, key, applyKey);
                    break;
                case "MIN":
                    representatives[i] = this.MIN(set, representative, key, applyKey);
                    break;
                case "AVG":
                    representatives[i] = this.AVG(set, representative, key, applyKey);
                    break;
                case "SUM":
                    representatives[i] = this.SUM(set, representative, key, applyKey);
                    break;
                case "COUNT":
                    representatives[i] = this.COUNT(set, representative, key, applyKey);
                    break;
            }
        }
        return representatives;
    }
    MAX(set, representative, key, applyKey) {
        const sizeOfSet = set.length;
        let max = set[0][key];
        for (let i = 1; i < sizeOfSet; i++) {
            const value = set[i][key];
            if (value > max) {
                max = value;
            }
        }
        representative[applyKey] = max;
        return representative;
    }
    MIN(set, representative, key, applyKey) {
        const sizeOfSet = set.length;
        let min = set[0][key];
        for (let i = 1; i < sizeOfSet; i++) {
            const value = set[i][key];
            if (value < min) {
                min = value;
            }
        }
        representative[applyKey] = min;
        return representative;
    }
    AVG(set, representative, key, applyKey) {
        const sizeOfSet = set.length;
        let Decimal = require("decimal.js");
        let total = new Decimal(0);
        for (let i = 0; i < sizeOfSet; i++) {
            let value = set[i][key];
            value = new Decimal(value);
            total = Decimal.add(total, value);
        }
        let avg = total.toNumber() / sizeOfSet;
        let result = Number(avg.toFixed(2));
        representative[applyKey] = result;
        return representative;
    }
    SUM(set, representative, key, applyKey) {
        const sizeOfSet = set.length;
        let sum = 0;
        for (let i = 0; i < sizeOfSet; i++) {
            const value = set[i][key];
            sum = sum + value;
        }
        let result = Number(sum.toFixed(2));
        representative[applyKey] = result;
        return representative;
    }
    COUNT(set, representative, key, applyKey) {
        const sizeOfSet = set.length;
        let uniqueSet = [];
        uniqueSet.push(set[0][key]);
        for (let i = 1; i < sizeOfSet; i++) {
            if (!this.haveSeenBefore(set[i][key], uniqueSet)) {
                uniqueSet.push(set[i][key]);
            }
        }
        const uniqueOccurrences = uniqueSet.length;
        representative[applyKey] = uniqueOccurrences;
        return representative;
    }
    haveSeenBefore(value, uniqueSet) {
        const sizeOfUniqueSet = uniqueSet.length;
        for (let i = 0; i < sizeOfUniqueSet; i++) {
            if (value === uniqueSet[i]) {
                return true;
            }
        }
        return false;
    }
    addKeyValue(set, applyKey, value) {
        const sizeOfSet = set.length;
        for (let i = 0; i < sizeOfSet; i++) {
            set[i][applyKey] = value;
        }
        return set;
    }
    getRepresentativesFromEachSet(sets) {
        const sizeOfSet = sets.length;
        let results = [];
        for (let i = 0; i < sizeOfSet; i++) {
            let element = sets[i][0];
            results.push(element);
        }
        return results;
    }
}
exports.default = QueryTransformer;
//# sourceMappingURL=QueryTransformer.js.map