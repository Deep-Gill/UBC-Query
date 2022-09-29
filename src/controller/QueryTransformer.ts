import QueryHelper from "./QueryHelper";
import QuerySorter from "./QuerySorter";

export default class QueryTransformer {
    private helper = new QueryHelper();
    private sorter = new QuerySorter();

    public queryTRANSFORMATIONS(data: any[], transformations: any, columnFields: string[]): any[] {
        const group: string[] = transformations.GROUP;
        const apply: any[] = transformations.APPLY;
        let sets: any[] = this.queryGROUP(data, group);
        let representatives: any[] = this.getRepresentativesFromEachSet(sets);
        representatives = this.queryAPPLY(sets, representatives, apply);
        let result = this.helper.OnlyIncludeColumnFields(representatives, columnFields);
        return result;
    }

    private queryGROUP(data: any[], group: any): any[] {
        let sets: any[] = [];
        sets.push(data);
        const sizeOfGroups: number = group.length;

        for (let i = 0; i < sizeOfGroups; i++) {
            let results: any[] = [];
            const key: string = group[i];
            let sizeOfSets: number = sets.length;
            for (let j = 0; j < sizeOfSets; j++) {
                let set: any[] = this.groupByKey(sets[j], key);
                results = results.concat(set);
            }
            sets = results;
        }

        return sets;
    }

    private groupByKey(data: any[], key: string): any[] {
        let sets: any[] = [];
        let keys: any[] = [];
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

    private queryAPPLY(sets: any[], representatives: any[], apply: any[]): any[] {
        const sizeOfApply: number = apply.length;
        for (let i = 0; i < sizeOfApply; i++) {
            const object: any = apply[i];
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

    private ApplyToken(applyKey: string, applyToken: string, key: any, sets: any[], representatives: any[]): any[] {
        const sizeOfSets: number = sets.length;
        for (let i = 0; i < sizeOfSets; i++) {
            let set: any[] = sets[i];
            let representative: any = representatives[i];
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

    private MAX(set: any[], representative: any, key: string, applyKey: string): any[] {
        const sizeOfSet: number = set.length;
        let max: number = set[0][key];
        for (let i = 1; i < sizeOfSet; i++) {
            const value: number = set[i][key];
            if (value > max) {
                max = value;
            }
        }
        representative[applyKey] = max;
        return representative;
    }

    private MIN(set: any[], representative: any, key: string, applyKey: string): any[] {
        const sizeOfSet: number = set.length;
        let min: number = set[0][key];
        for (let i = 1; i < sizeOfSet; i++) {
            const value: number = set[i][key];
            if (value < min) {
                min = value;
            }
        }
        representative[applyKey] = min;
        return representative;
    }

    private AVG(set: any[], representative: any, key: string, applyKey: string): any[] {
        const sizeOfSet: number = set.length;
        let Decimal = require("decimal.js");
        let total = new Decimal(0);
        for (let i = 0; i < sizeOfSet; i++) {
            let value: number = set[i][key];
            value = new Decimal(value);
            total = Decimal.add(total, value);
        }
        let avg = total.toNumber() / sizeOfSet;
        let result: number = Number(avg.toFixed(2));
        representative[applyKey] = result;
        return representative;
    }

    private SUM(set: any[], representative: any, key: string, applyKey: string): any[] {
        const sizeOfSet: number = set.length;
        let sum: number = 0;
        for (let i = 0; i < sizeOfSet; i++) {
            const value = set[i][key];
            sum = sum + value;
        }
        let result: number = Number(sum.toFixed(2));
        representative[applyKey] = result;
        return representative;
    }

    private COUNT(set: any[], representative: any, key: string, applyKey: string): any[] {
        const sizeOfSet: number = set.length;
        let uniqueSet: any[] = [];
        uniqueSet.push(set[0][key]);
        for (let i = 1; i < sizeOfSet; i++) {
            if (!this.haveSeenBefore(set[i][key], uniqueSet)) {
                uniqueSet.push(set[i][key]);
            }
        }
        const uniqueOccurrences: number = uniqueSet.length;
        representative[applyKey] = uniqueOccurrences;
        return representative;
    }

    private haveSeenBefore(value: any, uniqueSet: any[]): boolean {
        const sizeOfUniqueSet: number = uniqueSet.length;
        for (let i = 0; i < sizeOfUniqueSet; i++) {
            if (value === uniqueSet[i]) {
                return true;
            }
        }
        return false;
    }

    private addKeyValue(set: any[], applyKey: string, value: number): any[] {
        const sizeOfSet: number = set.length;
        for (let i = 0; i < sizeOfSet; i++) {
            set[i][applyKey] = value;
        }
        return set;
    }

    private getRepresentativesFromEachSet(sets: any[]): any[] {
        const sizeOfSet: number = sets.length;
        let results: any[] = [];
        for (let i = 0; i < sizeOfSet; i++) {
            let element: any = sets[i][0];
            results.push(element);
        }
        return results;
    }
}
