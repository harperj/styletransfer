var fs = require('fs');
var Deconstruction = require('d3-decon-lib').Deconstruction;
var _ = require('lodash');
var config = require('./config');

var getSemiologyRanking = function (mappingType, attr) {
    if (mappingType === "linear") {
        return config.semiology_lin[attr];
    }
    else {
        return config.semiology_nom[attr];
    }
};

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
        fieldData = _.map(fieldData, function(value) {return +value;});
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

var VEGALITE_ATTR_TO_SVG_ATTR = {
    color: 'fill',
    'x': 'xPosition',
    'y': 'yPosition'
};

var VEGALITE_ENCTYPE_TO_MAPPING_TYPE = {
    'Q': 'linear',
    'O': 'nominal',
    'N': 'nominal'
};

var getFieldFromVegaliteEncoding = function(encodingAttr, encoding, chartData) {
    var attr = VEGALITE_ATTR_TO_SVG_ATTR[encodingAttr];
    var type = VEGALITE_ENCTYPE_TO_MAPPING_TYPE[encoding.type];
    var fieldName = encoding.name;
    var fieldData = chartData[fieldName];
    var dataRange;
    if (type === "linear") {
        fieldData = _.map(fieldData, function(value) {return +value;});
        dataRange = [_.min(fieldData), _.max(fieldData)];
    }
    else {
        dataRange = _.uniq(fieldData);
    }

    return {
        fieldName: fieldName,
        rank: getSemiologyRanking(type, attr),
        mappingType: type,
        dataRange: dataRange,
        group: undefined,
        sourceData: chartData
    }
};

var reformatVegaliteData = function(dataObjects) {
    /**
     * Vegalite data tables are arrays of JSON objects
     * [ { obj1 }, { obj2 }, { obj3 } ]
     * such that each object has the same keys.  We'd
     * like to turn it into the format used by Deconstructions:
     * { key1: [obj1[key1], obj2[key1], obj3[key1]], key2: ... }
     *
     */

    var dataLists = {};
    dataObjects.values.forEach(function(dataObj) {
        for (dataCol in dataObj) {
            if (dataObj.hasOwnProperty(dataCol)) {
                dataLists[dataCol] ? dataLists[dataCol].push(dataObj[dataCol])
                                   : dataLists[dataCol] = [dataObj[dataCol]];
            }
        }
    });
    return dataLists;
};

var loadVegaLiteVis = function(filename) {
    var file = fs.readFileSync(filename, 'utf8');
    var vegaLiteVis = JSON.parse(file);
    var encodings = vegaLiteVis.encoding;
    var sourceDataFields = [];
    var dataTable = reformatVegaliteData(vegaLiteVis.data);

    Object.keys(encodings).forEach(function(encodingAttr) {
        var encoding = encodings[encodingAttr];
        var encodingSourceField = getFieldFromVegaliteEncoding(encodingAttr, encoding, dataTable);
        sourceDataFields.push(encodingSourceField);
    });

    console.log(sourceDataFields);
    return {
        '1': sourceDataFields
    };
};

module.exports = {
    loadDeconstructedVis: loadDeconstructedVis,
    loadJSONData: loadJSONData,
    loadVegaLiteVis: loadVegaLiteVis,
    getSemiologyRanking: getSemiologyRanking
};