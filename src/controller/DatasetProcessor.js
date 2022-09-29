"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
class DatasetProcessor {
    static readBuildings(buildings, buildingsToVisit) {
        let resultArray = [];
        let parsedBuildings = [];
        return Promise.all(buildings).then((results) => {
            for (let i in results) {
                parsedBuildings.push(DatasetProcessor.parseBuilding(results[i], buildingsToVisit[i].code, buildingsToVisit[i].name, buildingsToVisit[i].address));
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
    addRoomDataset(content) {
        let zip = require("jszip");
        let uncompressedZip;
        return zip.loadAsync(content, { base64: true })
            .then((files) => {
            uncompressedZip = files;
            return uncompressedZip.folder("rooms").file("index.htm").async("string");
        })
            .then((indexContent) => {
            return DatasetProcessor.parseIndexFile(indexContent);
        })
            .then((buildingsToVisit) => {
            let bFiles = [];
            for (let building of buildingsToVisit) {
                bFiles.push(uncompressedZip.file("rooms" + building.link).async("string"));
            }
            return DatasetProcessor.readBuildings(bFiles, buildingsToVisit);
        })
            .then((results) => {
            return Promise.resolve(results);
        })
            .catch((error) => {
            return Promise.reject(new IInsightFacade_1.InsightError("Failed to read rooms file: " + error.message));
        });
    }
    static getBuildingCoordinates(address) {
        let requestURL = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team192/" +
            encodeURI(address);
        let http = require("http");
        let coordinates = null;
        return new Promise((resolve, reject) => {
            http.get(requestURL, (response) => {
                if (response.statusCode !== 200) {
                    reject(new IInsightFacade_1.InsightError("GET request failed to geolocation"));
                }
                let rawData = "";
                response.on("data", (chunk) => rawData += chunk);
                response.on("end", () => {
                    try {
                        coordinates = JSON.parse(rawData);
                        resolve(coordinates);
                    }
                    catch (e) {
                        reject(new IInsightFacade_1.InsightError("Can't read JSON"));
                    }
                }).on("error", () => {
                    reject(new IInsightFacade_1.InsightError("GET request failed for some reason"));
                });
            });
        });
    }
    static getChildNodes(node, name) {
        if (node === null) {
            return [];
        }
        let resultNodes = [];
        for (let i = 0; i < node.childNodes.length; i++) {
            let a = i + 5;
            let currentNode = node.childNodes[i];
            if (currentNode.nodeName === name) {
                resultNodes.push(currentNode);
            }
            else if (currentNode.nodeName === "div" || currentNode.nodeName === "section") {
                DatasetProcessor.getChildNodes(currentNode, name).every((value) => {
                    resultNodes.push(value);
                });
            }
        }
        return resultNodes;
    }
    static getRowsFromFile(file, tableName) {
        return file.async("string").then((content) => {
            DatasetProcessor.getRowsFromHTML(content, tableName);
        });
    }
    static getRowsFromHTML(file, tableName) {
        const parser = require("parse5");
        const parsedFile = parser.parse(file);
        let body = parsedFile.childNodes[6].childNodes[3];
        let tables = DatasetProcessor.getChildNodes(body, "table");
        for (let table of tables) {
            let tBody = DatasetProcessor.getChildNodes(table, "tbody")[0];
            let rows = DatasetProcessor.getChildNodes(tBody, "tr");
            const testHeader = rows[0].childNodes[1];
            try {
                if (testHeader.attrs[0].value === tableName) {
                    return rows;
                }
            }
            catch (error) {
                continue;
            }
        }
        return null;
    }
    static stripText(textNode) {
        return textNode.value.replace(/^\s*|\s*$/g, "");
    }
    static parseBuilding(file, code, name, address) {
        const roomRows = DatasetProcessor.getRowsFromHTML(file, "views-field views-field-field-room-number");
        if (roomRows === null) {
            return Promise.resolve(null);
        }
        let buildingCoordinates = null;
        return DatasetProcessor.getBuildingCoordinates(address).then((data) => {
            buildingCoordinates = data;
            if (buildingCoordinates === null ||
                buildingCoordinates.hasOwnProperty("error")) {
                return Promise.resolve(null);
            }
            let resultArray = [];
            for (let i = 0; i < roomRows.length; i++) {
                let a = i + 5;
                let row = roomRows[i];
                let anchorLink = DatasetProcessor.getChildNodes(row.childNodes[1], "a")[0];
                let roomNumber = anchorLink.childNodes[0].value;
                let roomHref = anchorLink.attrs[0].value;
                let roomSeats = DatasetProcessor.stripText(row.childNodes[3].childNodes[0]);
                let roomFurniture = DatasetProcessor.stripText(row.childNodes[5].childNodes[0]);
                let roomType = DatasetProcessor.stripText(row.childNodes[7].childNodes[0]);
                let roomData = {
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
    static parseIndexFile(file) {
        let buildingRows = this.getRowsFromHTML(file, "views-field views-field-field-building-image");
        if (buildingRows === null) {
            return null;
        }
        let resultArray = [];
        for (let i = 0; i < buildingRows.length; i++) {
            let a = i + 5;
            let buildingRow = buildingRows[i];
            let buildingLink = DatasetProcessor.getChildNodes(buildingRow.childNodes[5], "a")[0];
            let buildingHref = buildingLink.attrs[0].value;
            let buildingName = buildingLink.childNodes[0].value;
            let buildingCode = DatasetProcessor.stripText(buildingRow.childNodes[3].childNodes[0]);
            let buildingAddress = DatasetProcessor.stripText(buildingRow.childNodes[7].childNodes[0]);
            resultArray.push({
                link: buildingHref.substr(1),
                code: buildingCode,
                name: buildingName,
                address: buildingAddress,
            });
        }
        return resultArray;
    }
    static getAllCourses(content) {
        let zip = require("jszip");
        let ListOfCourses = [];
        return zip.loadAsync(content, { base64: true })
            .then(function (jsZip) {
            jsZip
                .folder("courses")
                .forEach(function (relativePath, file) {
                if (relativePath !== ".DS_Store") {
                    const contentOfFile = file.async("string");
                    ListOfCourses.push(contentOfFile);
                }
            });
            return Promise.resolve(ListOfCourses);
        })
            .catch((error) => {
            return Promise.reject(new IInsightFacade_1.InsightError(error.message));
        });
    }
}
exports.default = DatasetProcessor;
//# sourceMappingURL=DatasetProcessor.js.map