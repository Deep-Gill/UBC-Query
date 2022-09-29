"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const QueryHelper_1 = require("./QueryHelper");
class QuerySorter {
    constructor() {
        this.helper = new QueryHelper_1.default();
    }
    sort(results, order) {
        let direction;
        let keys = [];
        if (typeof order === "string") {
            direction = "UP";
            keys.push(order);
        }
        else {
            direction = order.dir;
            keys = order.keys;
        }
        switch (direction) {
            case "UP":
                this.sortByKey(results, keys, true);
                break;
            case "DOWN":
                this.sortByKey(results, keys, false);
                break;
        }
    }
    sortByKey(results, keys, direction) {
        const orderByKey = keys[0];
        let tieBreak = this.helper.deleteAtIndex(keys, 0);
        let self = this;
        results.sort(function (a, b) {
            let x = a[orderByKey];
            let y = b[orderByKey];
            if (typeof x === "string" || x instanceof String) {
            }
            return self.compare(x, y, direction);
            if (tieBreak.length > 0) {
                return self.resolveTieBreak(a, b, direction, tieBreak);
            }
            else {
                return 0;
            }
        });
    }
    resolveTieBreak(a, b, direction, tieBreaks) {
        const sizeOfTieBreaks = tieBreaks.length;
        for (let i = 0; i < sizeOfTieBreaks; i++) {
            const orderByKey = tieBreaks[i];
            let x = a[orderByKey];
            let y = b[orderByKey];
            if (typeof x === "string" || x instanceof String) {
            }
            return this.compare(x, y, direction);
        }
        return 0;
    }
    compare(x, y, direction) {
        if (direction) {
            if (x < y) {
                return -1;
            }
            if (x > y) {
                return 1;
            }
        }
        else {
            if (x < y) {
                return 1;
            }
            if (x > y) {
                return -1;
            }
        }
    }
}
exports.default = QuerySorter;
//# sourceMappingURL=QuerySorter.js.map