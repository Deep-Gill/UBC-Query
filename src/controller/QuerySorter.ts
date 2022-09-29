import QueryHelper from "./QueryHelper";
export default class QuerySorter {
    private helper = new QueryHelper();

    public sort(results: any[], order: any) {
        let direction: string;
        let keys: string[] = [];
        if (typeof order === "string") {
            direction = "UP";
            keys.push(order);
        } else {
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

    public sortByKey(results: any[], keys: string[], direction: boolean) {
        const orderByKey: string = keys[0];
        let tieBreak: any[] = this.helper.deleteAtIndex(keys, 0);
        let self = this;
        results.sort(function (a, b) {
            let x = a[orderByKey];
            let y = b[orderByKey];
            if (typeof x === "string" || x instanceof String) {
                // x = x.toLowerCase();
                // y = y.toLowerCase();
            }
            return self.compare(x, y, direction);
            if (tieBreak.length > 0) {
                return self.resolveTieBreak(a, b, direction, tieBreak);
            } else {
                return 0;
            }
        });
    }

    private resolveTieBreak(a: any, b: any, direction: boolean, tieBreaks: any[]): number {
        const sizeOfTieBreaks: number = tieBreaks.length;
        for (let i = 0; i < sizeOfTieBreaks; i++) {
            const orderByKey: string = tieBreaks[i];
            let x: any = a[orderByKey];
            let y: any = b[orderByKey];
            if (typeof x === "string" || x instanceof String) {
                // x = x.toLowerCase();
                // y = y.toLowerCase();
            }
            return this.compare(x, y, direction);
        }
        return 0;
    }

    private compare(x: number, y: number, direction: boolean): number {
        if (direction) {
            if (x < y) {
                return -1;
            }
            if (x > y) {
                return 1;
            }
        } else {
            if (x < y) {
                return 1;
            }
            if (x > y) {
                return -1;
            }
        }
    }
}
