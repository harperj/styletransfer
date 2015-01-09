/**
 * Created by harper on 11/25/14.
 */

var Deconstruction = require('./Deconstruction');
var Mapping = require('./Mapping');
var fs = require('fs');
var _ = require('underscore');
var assert = require('assert');
var clone = require('clone');
var ss = require('simple-statistics');

var config = require('./config');
var transferTests = require('./tests');

var loadDeconstructedVis = function(filename) {
    var file = fs.readFileSync(filename, 'utf8');
    var decon = JSON.parse(file);
    return Deconstruction.fromJSON(decon);
};

var getSemiologyRanking = function(mapping) {
    if (mapping.type === "linear") {
        return _.indexOf(config.semiology_lin, mapping.attr);
    }
    else {
        return _.indexOf(config.semiology_nom, mapping.attr);
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

        if (rank < min && !_.contains(skipList, mapping) && !skipNotLinear) {
            min = rank;
            minMapping = mapping;
        }
    });
    return minMapping;
};

var transferStyle = function(sourceVis, targetVis) {
    var newVis = clone(sourceVis);
    newVis.mappings = [];

    var sourceProcessedMappings = [];
    var targetProcessedMappings = [];

    while (sourceProcessedMappings.length < sourceVis.mappings.length) {
        var sourceNextMapping = getMinRanked(sourceVis.mappings, sourceProcessedMappings);
        var targetNextMapping;

        if (sourceNextMapping.type === "linear") {
            targetNextMapping = getMinRanked(targetVis.mappings, targetProcessedMappings, true);
        }
        else {
            targetNextMapping = getMinRanked(targetVis.mappings, targetProcessedMappings);
        }

        if (!targetNextMapping) {
            break;
        }

        var newMapping = transferMapping(sourceNextMapping, targetNextMapping, sourceVis, targetVis);
        if (newMapping)
            newVis.mappings.push(newMapping);
        sourceProcessedMappings.push(sourceNextMapping);
        targetProcessedMappings.push(targetNextMapping);

        //var propagated = propagateMappings(newMapping, sourceNextMapping, targetNextMapping, sourceProcessedMappings, targetProcessedMappings, sourceVis, targetVis);
        //newVis.mappings = newVis.mappings.concat(propagated);
    }
    transferUnmapped(targetVis, newVis);

    return newVis;
};

var propagateMappings = function(newMapping, sourceNextMapping, targetNextMapping, sourceProcessedMappings, targetProcessedMappings, sourceVis, targetVis) {
    var propagatedMappings = [];

    // find other target mappings with the same data field
    var sameDataMappings = [];
    _.each(targetVis.mappings, function(mapping) {
        if (mapping.data[0] === targetNextMapping.data[0]
            && mapping.type === "linear"
            && !_.contains(targetProcessedMappings, mapping)) {

            sameDataMappings.push(mapping);
        }
    });

    _.each(sameDataMappings, function(mapping) {
        var rel = findRelationship(targetNextMapping, mapping);
        var newMappingCoeffs = propagateCoeffs(newMapping, rel);
        var newPropagatedMapping = new Mapping(sourceNextMapping.data, mapping.attr, "linear", {coeffs: newMappingCoeffs});
        propagatedMappings.push(newPropagatedMapping);
        targetProcessedMappings.push(mapping);
    });

    _.each(sourceVis.mappings, function(mapping) {
        if (mapping.data[0] === sourceNextMapping.data[0]
            && mapping.type === "linear"
            && !_.contains(sourceProcessedMappings, mapping)) {

            sourceProcessedMappings.push(mapping);
        }
    });
    return propagatedMappings;
};

//var zeroWidthScale = function(vis) {
//    var scale = {};
//    if (vis.getMappingForAttr("xPosition") && vis.getMappingForAttr("width")) {
//        var intercept = vis.getMappingForAttr("width").getZeroVal();
//        scale.xMin = vis.getMappingForAttr("xPosition").map(intercept);
//        scale.xMax = _.max(vis.attrs["xPosition"]);
//    }
//    else {
//        scale.xMin = _.min(vis.attrs["xPosition"]);
//        scale.xMax = _.max(vis.attrs["xPosition"]);
//    }
//
//    if (vis.getMappingForAttr("yPosition") && vis.getMappingForAttr("height")) {
//        var intercept = vis.getMappingForAttr("height").getZeroVal();
//        scale.yMin = _.min(vis.attrs["yPosition"]);
//        scale.yMax = vis.getMappingForAttr("yPosition").map(intercept);
//    }
//    else {
//        scale.yMin = _.min(vis.attrs["yPosition"]);
//        scale.yMax = _.max(vis.attrs["yPosition"]);
//    }
//
//    scale.maxWidth = _.max(vis.attrs["width"]);
//    scale.maxHeight = _.max(vis.attrs["height"]);
//
//    return scale;
//};

var transferMapping = function(sourceMapping, targetMapping, sourceVis, targetVis) {

    // If enabled, we'll transfer layouts with regular intervals by hacking deconID mappings
    if (config.regular_interval_layout) {
        if (sourceMapping.type === "linear" && targetMapping.type === "linear") {
            var newMapping = transferIntervalMapping(sourceMapping, targetMapping, sourceVis, targetVis);
            if (newMapping) {
                return newMapping;
            }
        }
    }

    var sourceScale = sourceVis.getMarkBoundingBox();
    var targetScale = targetVis.getMarkBoundingBox();
    if (sourceMapping.type === "linear") {
        return transferMappingLinear(sourceMapping, targetMapping, sourceScale, targetScale);
    }
    else {
        return undefined;
    }
};


var transferIntervalMapping = function(sourceMapping, targetMapping, sourceVis, targetVis) {
    var sourceAttrVals = sourceVis.attrs[sourceMapping.attr];
    var targetAttrVals = targetVis.attrs[targetMapping.attr];

    var sourceInterval = getArrayInterval(sourceAttrVals);
    var targetInterval = getArrayInterval(targetAttrVals);

    var sourceData = sourceVis.data[sourceMapping.data];
    var sourceDataInterval = getArrayInterval(sourceData);

    var minTargetData = _.min(targetVis.data[targetMapping.data]);


    if (sourceInterval && targetInterval) {
        var coeffs = getLinearCoeffs([
            [_.min(sourceData), _.min(targetAttrVals)],
            [_.min(sourceData) + sourceDataInterval, _.min(targetAttrVals) + targetInterval]
        ]);

        var params = {
            attrMin: _.min(targetAttrVals),
            coeffs: coeffs
        };
        return new Mapping(sourceMapping.data, targetMapping.attr, 'linear', params)
    }
};

var getArrayInterval = function(arr) {
    var EPSILON = Math.pow(2, -8);
    function epsEqu(x, y) {
        return Math.abs(x - y) < EPSILON;
    }

    var data = clone(arr);
    data.sort(function(a, b){return a-b});

    var interval = null;
    for (var i = 1; i < data.length; ++i) {
        var currInterval = data[i] - data[i-1];
        if (!interval) {
            interval = currInterval;
        }
        else if (!epsEqu(interval, currInterval)) {
            return null;
        }
    }
    return interval;
};

var transferUnmapped = function(sourceVis, transferredVis) {
    var mappedAttrs = _.map(transferredVis.mappings, function(mapping) {
        return mapping.attr;
    });
    mappedAttrs = _.uniq(mappedAttrs);

    _.each(sourceVis.attrs, function(valArray, attr) {
        if (!_.contains(mappedAttrs, attr)) {
            for (var i = 0; i < transferredVis.attrs[attr].length; ++i) {
                transferredVis.attrs[attr][i] = valArray[0];
            }
        }
    });
};

var getLinearCoeffs = function(pairs) {
    var line = ss.linear_regression()
        .data(pairs);
    return [line.m(), line.b()];
};

var transferMappingLinear = function(sourceMapping, targetMapping, sourceScale, targetScale) {
    var newMapping = {
        type: "linear",
        data: sourceMapping.data,
        attr: targetMapping.attr,
        params: {}
    };

    var sourceMap = new Mapping(sourceMapping.data, sourceMapping.attr, sourceMapping.type, sourceMapping.params);
    if (targetMapping.attr === "xPosition") {
        newMapping.params.coeffs = getLinearCoeffs([
            [sourceMap.dataFromAttr(sourceScale.x), targetScale.x],
            [sourceMap.dataFromAttr(sourceScale.x + sourceScale.width), targetScale.x + targetScale.width]
        ]);
    }
    else if(targetMapping.attr === "yPosition") {
        newMapping.params.coeffs = getLinearCoeffs([
            [sourceMap.dataFromAttr(sourceScale.y), targetScale.y],
            [sourceMap.dataFromAttr(sourceScale.y + sourceScale.height), targetScale.y + targetScale.height]
        ]);
    }
    else if(targetMapping.attr === "width" || targetMapping.attr === "height") {
        var sourceMax, targetMax;
        if (targetMapping.attr === "width") {
            sourceMax = sourceScale.width;
            targetMax = targetScale.width;
        }
        if (targetMapping.attr === "height") {
            sourceMax = sourceScale.height;
            targetMax = targetScale.height;
        }

        newMapping.params.coeffs = getLinearCoeffs([
            [sourceMap.dataFromAttr(0), 0],
            [sourceMap.dataFromAttr(sourceMax), targetMax]
        ]);
    }
    else {
        newMapping.params.coeffs = [0, 0];
    }
    return newMapping;
};

var findRelationship = function(mapping1, mapping2) {
    assert(mapping1.type === "linear");
    assert(mapping2.type === "linear");

    var a = mapping1.params.coeffs[0];
    var b = mapping1.params.coeffs[1];
    var x = mapping2.params.coeffs[0];
    var y = mapping2.params.coeffs[1];

    var relCoeff1 = x / a;
    var relCoeff2 = y - ((b * x) / a);
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

var main = function() {
    _.each(transferTests, function(test, testName) {
        var sourceDecon = loadDeconstructedVis(test.source_file);
        var targetDecon = loadDeconstructedVis(test.target_file);

        test.result = {
            "svg": targetDecon.svg,
            "marks": []
        };
        _.each(test.transfers, function(transfer) {
            var result = transferStyle(
                sourceDecon.getSchemaByName(transfer[0]),
                targetDecon.getSchemaByName(transfer[1])
            );
            result.updateAttrsFromMappings();
            test.result.marks.push(result);
        });
    });
    fs.writeFile('out.json', JSON.stringify(transferTests));
};

if (require.main === module) {
    main();
}

module.exports = {
    loadDeconstructedVis: loadDeconstructedVis,
    transferStyle: transferStyle
};