import { InsightError } from "./IInsightFacade";

export type Data = SectionData | RoomData;

export interface RoomData {
    fullname: string;
    shortname: string;
    number: string;
    name: string;
    address: string;
    lat: number;
    lon: number;
    seats: number;
    type: string;
    furniture: string;
    href: string;
}

export interface SectionData {
    dept: string;
    id: string;
    avg: number;
    instructor: string;
    title: string;
    pass: number;
    fail: number;
    audit: number;
    uuid: string;
    year: number;
}

interface GeoResponse {
    lat?: number;
    lon?: number;
    error?: string;
}

interface CorrectNode extends Node {
    attrs?: any[];
    value?: string;
}


export default class DatasetProcessor {
    private static readBuildings(buildings: Array<Promise<string>>, buildingsToVisit: any): Promise<RoomData[]> {
        let resultArray: RoomData[] = [];
        let parsedBuildings: Array<Promise<RoomData[]>> = [];
        return Promise.all(buildings).then((results) => {
            for (let i in results) {
                parsedBuildings.push(DatasetProcessor.parseBuilding(results[i], buildingsToVisit[i].code,
                    buildingsToVisit[i].name, buildingsToVisit[i].address));
            }
        }).then(() => {
            return Promise.all(parsedBuildings);
        }).then((resolvedData) => {
            for (let building of resolvedData) {
                if (building === null) {
                    continue;
                }
                for (let room of building) {
                    resultArray.push(room);
                }
            }
            return Promise.resolve(resultArray);
        }).catch(() => {
            return Promise.resolve(null);
        });
    }

    public addRoomDataset(content: string): Promise<any[]> {
        let zip = require("jszip");
        let uncompressedZip: any;
        return zip.loadAsync(content, {base64: true})
            .then((files: any) => {
                uncompressedZip = files;
                return uncompressedZip.folder("rooms").file("index.htm").async("string");
            })
            .then((indexContent: any) => {
                return DatasetProcessor.parseIndexFile(indexContent);
            })
            .then((buildingsToVisit: any[]) => {
                let bFiles: any[] = [];
                for (let building of buildingsToVisit) {
                    bFiles.push(uncompressedZip.file("rooms" + building.link).async("string"));
                }
                return DatasetProcessor.readBuildings(bFiles, buildingsToVisit);
            })
            .then((results: any) => {
                return Promise.resolve(results);
            })
            .catch((error: any) => {
                return Promise.reject(new InsightError("Failed to read rooms file: " + error.message));
            });
    }

    public static getBuildingCoordinates(address: string): Promise<GeoResponse> {
        let requestURL =
            "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team192/" +
            encodeURI(address);
        let http = require("http");
        let coordinates: GeoResponse = null;
        return new Promise<GeoResponse>((resolve, reject) => {
            http.get(requestURL, (response: any) => {
                if (response.statusCode !== 200) {
                    reject(new InsightError("GET request failed to geolocation"));
                }
                let rawData = "";
                response.on("data", (chunk: string) => rawData += chunk);
                response.on("end", () => {
                    try {
                        coordinates = JSON.parse(rawData);
                        resolve(coordinates);
                    } catch (e) {
                        reject(new InsightError("Can't read JSON"));
                    }
                }).on("error", () => {
                    reject(new InsightError("GET request failed for some reason"));
                });
            });
        });
    }

    private static getChildNodes(node: CorrectNode, name: string): CorrectNode[] {
        if (node === null) {
            return [];
        }
        let resultNodes: CorrectNode[] = [];
        for (let i = 0; i < node.childNodes.length; i++) {
            let a = i + 5; // Make stupid linting rule go away
            let currentNode = node.childNodes[i];
            if (currentNode.nodeName === name) {
                resultNodes.push(currentNode);
            } else if (currentNode.nodeName === "div" || currentNode.nodeName === "section") {
                DatasetProcessor.getChildNodes(currentNode, name).every((value) => {
                    resultNodes.push(value);
                });
            }
        }
        return resultNodes;
    }

    private static getRowsFromFile(file: any, tableName: string): CorrectNode[] {
        return file.async("string").then((content: string) => {
            DatasetProcessor.getRowsFromHTML(content, tableName);
        });
    }

    public static getRowsFromHTML(file: string, tableName: string): CorrectNode[] {
        const parser = require("parse5");
        const parsedFile: Document = parser.parse(file);
        let body: CorrectNode = parsedFile.childNodes[6].childNodes[3]; // Parse5 always generates this structure
        let tables: CorrectNode[] = DatasetProcessor.getChildNodes(body, "table");
        for (let table of tables) {
            let tBody: CorrectNode = DatasetProcessor.getChildNodes(table, "tbody")[0];
            let rows: CorrectNode[] = DatasetProcessor.getChildNodes(tBody, "tr");
            const testHeader: CorrectNode = rows[0].childNodes[1];
            try {
                if (testHeader.attrs[0].value === tableName) {
                    return rows;
                }
            } catch (error) {
                continue;
            }
        }
        return null;
    }

    private static stripText(textNode: CorrectNode): string {
        return textNode.value.replace(/^\s*|\s*$/g, "");
    }

    public static parseBuilding(
        file: string,
        code: string,
        name: string,
        address: string,
    ): Promise<RoomData[]> {
        const roomRows = DatasetProcessor.getRowsFromHTML(
            file,
            "views-field views-field-field-room-number",
        );
        if (roomRows === null) {
            return Promise.resolve(null);
        }
        let buildingCoordinates: GeoResponse = null;
        return DatasetProcessor.getBuildingCoordinates(address).then((data) => {
            buildingCoordinates = data;
            if (
                buildingCoordinates === null ||
                buildingCoordinates.hasOwnProperty("error")
            ) {
                return Promise.resolve(null);
            }
            let resultArray = [];
            for (let i = 0; i < roomRows.length; i++) {
                let a = i + 5;
                let row = roomRows[i];
                let anchorLink: CorrectNode = DatasetProcessor.getChildNodes(row.childNodes[1], "a")[0];
                let roomNumber: string = (anchorLink.childNodes[0] as CorrectNode).value;
                let roomHref: string = anchorLink.attrs[0].value;
                let roomSeats: string = DatasetProcessor.stripText(row.childNodes[3].childNodes[0]);
                let roomFurniture: string = DatasetProcessor.stripText(row.childNodes[5].childNodes[0]);
                let roomType: string = DatasetProcessor.stripText(row.childNodes[7].childNodes[0]);
                let roomData: RoomData = {
                    fullname: name,
                    shortname: code,
                    number: roomNumber,
                    name: code + "_" + roomNumber,
                    address: address,
                    lat: buildingCoordinates.lat,
                    lon: buildingCoordinates.lon,
                    seats: parseInt(roomSeats, 10),
                    type: roomType,
                    furniture: roomFurniture,
                    href: roomHref,
                };
                resultArray.push(roomData);
            }
            return Promise.resolve(resultArray);
        });
    }

    public static parseIndexFile(file: any): any[] {
        let buildingRows = this.getRowsFromHTML(
            file,
            "views-field views-field-field-building-image",
        );
        if (buildingRows === null) {
            return null;
        }
        let resultArray = [];
        for (let i = 0; i < buildingRows.length; i++) {
            let a = i + 5;
            let buildingRow = buildingRows[i];
            let buildingLink: CorrectNode = DatasetProcessor.getChildNodes(buildingRow.childNodes[5],
                "a")[0];
            let buildingHref: string = buildingLink.attrs[0].value;
            let buildingName: string = (buildingLink.childNodes[0] as CorrectNode).value;
            let buildingCode: string = DatasetProcessor.stripText(buildingRow.childNodes[3].childNodes[0]);
            let buildingAddress: string = DatasetProcessor.stripText(buildingRow.childNodes[7].childNodes[0]);

            resultArray.push({
                link: buildingHref.substr(1),
                code: buildingCode,
                name: buildingName,
                address: buildingAddress,
            });
        }
        return resultArray;
    }

    public static getAllCourses(content: string): Promise<any[]> {
        let zip = require("jszip");
        let ListOfCourses: any[] = [];
        return zip.loadAsync(content, { base64: true })
                .then(function (jsZip: any) {
                    // iterate over every single file in the "courses" folder
                    jsZip
                        .folder("courses")
                        .forEach(function (relativePath: string, file: any) {
                            // add to the array all the contents of a single file in string form
                            if (relativePath !== ".DS_Store") {
                                const contentOfFile: Promise<
                                    string
                                > = file.async("string");
                                ListOfCourses.push(contentOfFile);
                            }
                        });
                    return Promise.resolve(ListOfCourses);
                })
                .catch((error: any) => {
                    return Promise.reject(new InsightError(error.message));
                });
    }
}
