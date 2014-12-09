/**
 * Created by harper on 11/25/14.
 */

var Schema = require('./Schema');
var Mapping = require('./Mapping');
var fs = require('fs');
var _ = require('underscore');
var assert = require('assert');
var clone = require('clone');
var ss = require('simple-statistics');

var semiology_lin = ["xPosition", "yPosition", "width", "height", "area", "opacity", "fill", "stroke"];
var semiology_nom = ["xPosition", "yPosition",  "fill", "stroke", "opacity", "shape", "width", "height", "area"];


var main = function() {
    var source_obj = JSON.parse(fs.readFileSync('data/dutoit_bars.json', 'utf8'));
    source_obj = source_obj[0];

    var target_obj = JSON.parse(fs.readFileSync('data/cereal_scatter.json', 'utf8'));
    target_obj = target_obj[0];

    var sourceVis = Schema.fromJSON(source_obj);
    var targetVis = Schema.fromJSON(target_obj);

    var newVis = transferStyle(sourceVis, targetVis);
    newVis.updateAttrsFromMappings();
    fs.writeFile('out.decon.json', JSON.stringify(newVis));
};

var loadDeconstructedVis = function(filename) {
    var file = fs.readFileSync(filename, 'utf8');
    var vis = JSON.parse(file);
    _.each(vis, function(val, ind) {

    });
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

var zeroWidthScale = function(vis) {
    var scale = {};
    if (vis.getMappingForAttr("xPosition") && vis.getMappingForAttr("width")) {
        var intercept = vis.getMappingForAttr("width").getZeroVal();
        scale.xMin = vis.getMappingForAttr("xPosition").map(intercept);
        scale.xMax = _.max(vis.attrs["xPosition"]);
    }
    else {
        scale.xMin = _.min(vis.attrs["xPosition"]);
        scale.xMax = _.max(vis.attrs["xPosition"]);
    }

    if (vis.getMappingForAttr("yPosition") && vis.getMappingForAttr("height")) {
        var intercept = vis.getMappingForAttr("height").getZeroVal();
        scale.yMin = _.min(vis.attrs["yPosition"]);
        scale.yMax = vis.getMappingForAttr("yPosition").map(intercept);
    }
    else {
        scale.yMin = _.min(vis.attrs["yPosition"]);
        scale.yMax = _.max(vis.attrs["yPosition"]);
    }

    scale.maxWidth = _.max(vis.attrs["width"]);
    scale.maxHeight = _.max(vis.attrs["height"]);

    return scale;
};

var transferMapping = function(sourceMapping, targetMapping, sourceVis, targetVis) {

    var sourceScale = sourceVis.getMarkBoundingBox();
    var targetScale = targetVis.getMarkBoundingBox();

    if (sourceMapping.type === "linear") {
        return transferMappingLinear(sourceMapping, targetMapping, sourceScale, targetScale);
    }
    else {
        return undefined;
    }
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

if (require.main === module) {
    main();
}
