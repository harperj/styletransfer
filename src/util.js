var fs = require('fs');
var Deconstruction = require('d3-decon-lib').Deconstruction;
var _ = require('lodash');

var loadDeconstructedVis = function (filename) {
    var file = fs.readFileSync(filename, 'utf8');
    var decon = JSON.parse(file);
    return Deconstruction.fromJSON(decon);
};

var loadJSONData = function(filename) {
    var file = fs.readFileSync(filename, 'utf8');
    var dataset = JSON.parse(file);
    var parsedFields = [];
    _.each(_.keys(dataset.data), function(columnName) {
        var parsedField = parseJSONDataField(dataset, columnName);
        parsedFields.push(parsedField);
    });
    return {
        '1': parsedFields
    };
};

var parseJSONDataField = function(dataset, columnName) {
    var fieldName = columnName;
    var rank = dataset.ranks[columnName];
    var mappingType = dataset.types[columnName];
    var fieldData = dataset.data[columnName];
    var dataRange;
    if (mappingType === "linear") {
        fieldData = _.map(fieldData, function(value) {return +value;})
        dataRange = [_.min(fieldData), _.max(fieldData)];
    }
    else {
        dataRange = _.uniq(fieldData);
    }

    return {
        fieldName: fieldName,
        rank: rank,
        mappingType: mappingType,
        dataRange: dataRange,
        group: undefined,
        sourceData: dataset.data
    };
};

module.exports = {
    loadDeconstructedVis: loadDeconstructedVis,
    loadJSONData: loadJSONData
};