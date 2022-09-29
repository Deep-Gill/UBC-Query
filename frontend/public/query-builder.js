/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = () => {
    let query = {};
    // TODO: implement!
    let id;
    let roomClass = document.getElementById("tab-rooms").className;
    let coursesClass = document.getElementById("tab-courses").className;
    if (roomClass === "tab-panel active") {
        id = "rooms_";
    } else if (coursesClass === "tab-panel active") {
        id = "courses_";
    }

    let where   = buildWhere(id);
    let columns = buildColumns(id);
    let order   = buildOrder(id);
    let group   = buildGroup(id);
    let apply   = buildApply(id);
    let options = {};
    let transformations = {};
    query["WHERE"] = where;
    options["COLUMNS"] = columns;
    if (order.keys.length !== 0) {
        if (order.keys.length === 1 && order.dir === "UP") {
            options["ORDER"] = order.keys[0];
        } else {
            options["ORDER"] = order;
        }
    }
    query["OPTIONS"] = options;
    if (group.length !== 0 || apply.length !== 0) {
        transformations["GROUP"] = group;
        transformations["APPLY"] = apply;
        query["TRANSFORMATIONS"] = transformations;
    }
    return query;
};

function getSelected(field) {
    for (let option of field.getElementsByTagName("option")) {
        if (option.hasAttribute("selected")) {
            return option.value;
        }
    }
}

function constructCondition(id, condition) {
    let numberfields = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
    let conditionQuery = {};
    let isNegated = condition.getElementsByTagName("input")[0].hasAttribute("checked");
    let conditionField = getSelected(condition.getElementsByClassName("fields")[0]);
    let conditionTerm = condition.getElementsByTagName("input")[1].value;
    if (numberfields.indexOf(conditionField) !== -1) {
        try {
            conditionTerm = parseInt(conditionTerm, 10);
        } catch (e) {
            conditionTerm = "";
        }
    }
    conditionField = id + conditionField;
    let conditionOperator = getSelected(condition.getElementsByClassName("operators")[0]);
    conditionQuery = {[conditionOperator]: {[conditionField]: conditionTerm}};
    if (isNegated) {
        conditionQuery = {"NOT": conditionQuery};
    }
    return conditionQuery;
}

function buildWhere(id) {
    let formGroup, selectedRadio;
    let result = {};
    if (id === "courses_") {
        formGroup = document.getElementById("tab-courses");
    } else if (id === "rooms_") {
        formGroup = document.getElementById("tab-rooms");
    }
    let logic = formGroup.getElementsByClassName("condition-type")[0].getElementsByTagName("input");
    for (let radio of logic) {
        if (radio.hasAttribute("checked")) {
            selectedRadio = radio.id;
            break;
        }
    }
    let conditions = formGroup.getElementsByClassName("condition");
    if (conditions.length > 1) {
        result = [];
    }
    for (let condition of conditions) {
        let conditionQuery = constructCondition(id, condition);
        if (conditions.length > 1) {
            result.push(conditionQuery);
        } else {
            result = conditionQuery;
        }
    }
    if ((selectedRadio === "rooms-conditiontype-none" || selectedRadio === "courses-conditiontype-none")
        && conditions.length === 1) {
        result = {"NOT": result};
    }
    else if (conditions.length > 1) {
        switch (selectedRadio) {
            case "rooms-conditiontype-all":
            case "courses-conditiontype-all":
                result = {"AND": result};
                break;
            case "rooms-conditiontype-any":
            case "courses-conditiontype-any":
                result = {"OR": result};
                break;
            case "rooms-conditiontype-none":
            case "courses-conditiontype-none":
                result = {"NOT": {"OR": result}};
        }
    }
    return result;
}

function buildColumns(id) {
    let columns = [];
    let formGroup;
    if (id === "courses_") {
        formGroup = document.getElementById("tab-courses");
    } else if (id === "rooms_") {
        formGroup = document.getElementById("tab-rooms");
    }
    let columnField = formGroup.getElementsByClassName("form-group columns")[0];
    let controlFields = columnField.getElementsByClassName("control field");
    for (let field of controlFields) {
        let checked = field.querySelector("input[checked]");
        if (checked) {
            let value = checked.value;
            let element = id + value;
            columns.push(element);
        }
    }
    let controlTransformations = columnField.getElementsByClassName("control transformation");
    for (let transformation of controlTransformations) {
        let checked = transformation.querySelector("input[checked]");
        if (checked) {
            columns.push(checked.value);
        }
    }
    return columns;
}

function buildOrder(id) {
    let dataKeys = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid",
        "lat", "lon", "seats", "fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
    let result = {};
    let keys = [];
    let formGroup;
    if (id === "courses_") {
        formGroup = document.getElementById("tab-courses");
    } else if (id === "rooms_") {
        formGroup = document.getElementById("tab-rooms");
    }
    let columnField = formGroup.getElementsByClassName("form-group order")[0];
    let direction = columnField.getElementsByClassName("control descending")[0];
    let checked = direction.querySelector("input[checked]");
    if (checked === null) {
        result["dir"] = "UP";
    } else {
        result["dir"] = "DOWN";
    }
    let controlFields = columnField.getElementsByClassName("control order fields")[0];
    let fields = controlFields.querySelectorAll("option[selected]");
    for (let field of fields) {
        let element;
        let key = field.value;
        if (!dataKeys.includes(key)) {
            element = key;
        } else {
            element = id + key;
        }
        keys.push(element);
    }
    result["keys"] = keys;
    return result;
}

function buildGroup(id) {
    let results = [];
    let formGroup;
    if (id === "courses_") {
        formGroup = document.getElementById("tab-courses");
    } else if (id === "rooms_") {
        formGroup = document.getElementById("tab-rooms");
    }
    let groupField = formGroup.getElementsByClassName("form-group groups")[0];
    let controlGroup = groupField.getElementsByClassName("control-group")[0];
    let fields = controlGroup.querySelectorAll("input[checked]");
    for (let field of fields) {
        let key = field.value;
        let element = id + key;
        results.push(element);
    }

    return results;
}

function buildApply(id) {
    let result = [];
    let formGroup;
    if (id === "courses_") {
        formGroup = document.getElementById("tab-courses");
    } else if (id === "rooms_") {
        formGroup = document.getElementById("tab-rooms");
    }
    let groupField = formGroup.getElementsByClassName("form-group transformations")[0];
    let containers = groupField.getElementsByClassName("control-group transformation");
    for (let container of containers) {
        let controlTerm = container.getElementsByClassName("control term")[0];
        let applyKey = controlTerm.querySelector("input[type]").value;
        let controlOperators = container.getElementsByClassName("control operators")[0];
        let applyToken = controlOperators.querySelector("option[selected]").value;
        let controlFields = container.getElementsByClassName("control fields")[0];
        let key = controlFields.querySelector("option[selected]").value;
        let element = id + key;
        let entry = {};
        let entry2 = {};
        entry2[applyToken] = element;
        entry[applyKey] = entry2;
        result.push(entry);
    }
    return result;
}
