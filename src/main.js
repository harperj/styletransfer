/**
 * Created by harper on 11/25/14.
 */

var Schema = require('./Schema');
var fs = require('fs');
var _ = require('underscore');
var assert = require('assert');

var semiology_lin = ["xPosition", "yPosition", "width", "height", "area", "opacity", "fill", "stroke"];
var semiology_nom = ["xPosition", "yPosition",  "fill", "stroke", "opacity", "shape", "width", "height", "area"];


var main = function() {
    var source_obj = JSON.parse(fs.readFileSync('data/murray_bars.json', 'utf8'));
    source_obj = source_obj[0];

    var target_obj = JSON.parse(fs.readFileSync('data/pudney_bars.json', 'utf8'));
    target_obj = target_obj[0];

    var sourceVis = Schema.fromJSON(source_obj);
    var targetVis = Schema.fromJSON(target_obj);

    transferStyle(sourceVis, targetVis);
};

var getSemiologyRanking = function(mapping) {
    if (mapping.type === "linear") {
        return _.indexOf(semiology_lin, mapping.attr);
    }
    else {
        return _.indexOf(semiology_nom, mapping.attr);
    }
};

var getMinRanked = function(mappingArray, skipList, requireLinear) {
    if (!skipList) {
        skipList = [];
    }

    var min = Number.MAX_VALUE;
    var minMapping;
    _.each(mappingArray, function(mapping) {
        var rank = getSemiologyRanking(mapping);

        var skipNotLinear = requireLinear && mapping.type !== "linear";

        if (rank < min && !_.contains(skipList, mapping) && skipNotLinear) {
            min = rank;
            minMapping = mapping;
        }
    });
    return minMapping;
};

var transferStyle = function(sourceVis, targetVis) {
    var sourceProcessedMappings = [];
    var targetProcessedMappings = [];

    while (sourceProcessedMappings.length < sourceVis.mappings.length) {
        var sourceNextMapping = getMinRanked(sourceVis.mappings);
        var targetNextMapping;

        if (sourceNextMapping.type === "linear") {
            targetNextMapping = getMinRanked(targetVis.mappings, sourceProcessedMappings, true);
        }
        else {
            targetNextMapping = getMinRanked(targetVis.mappings, sourceProcessedMappings);
        }

        var newMapping = transferMapping(sourceNextMapping, targetNextMapping);
    }
};

var transferMappingLinear = function(sourceMapping, targetMapping) {
};

var findRelationship = function(mapping1, mapping2) {
    assert(mapping1.type === "linear");
    assert(mapping2.type === "linear");

    var a = mapping1.params.coeffs[0];
    var b = mapping1.params.coeffs[1];
    var c = mapping2.params.coeffs[0];
    var d = mapping2.params.coeffs[1];

    var relCoeff1 = c / a;
    var relCoeff2 = d - (c * b) / a;
    return [relCoeff1, relCoeff2];
};

var propagateCoeffs = function(mapping, relationship) {
    var a = relationship[0];
    var b = relationship[1];
    var c = mapping.params.coeffs[0];
    var d = mapping.params.coeffs[1];

    var transferredCoeff1 = c*a;
    var transferredCoeff2 = d*a + b;
    return [transferredCoeff1, transferredCoeff2];
};

if (require.main === module) {
    main();
}