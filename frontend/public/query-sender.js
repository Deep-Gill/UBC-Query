/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */

CampusExplorer.sendQuery = (query) => {
    return new Promise((resolve, reject) => {
        // TODO: implement!
        try {
            let request = new XMLHttpRequest();
            request.open("POST", "/query");
            request.onload = function () {
                if (request.status === 200) {
                    console.log("POST request was successful");
                    let data = JSON.parse(request.response);
                    resolve(data);
                } else if (request.status === 400) {
                    console.log("POST requested returned an error with the status: " + request.status);
                    reject(request.status);
                }
            };
            request.send(JSON.stringify(query));
        } catch (error) {
            console.log("sendQuery returned an error with the message: " + error.message);
            reject(error.message);
        }
    });
};
