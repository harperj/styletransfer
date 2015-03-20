/**
 * Created by harper on 11/25/14.
 */

var Deconstruction = require('d3-decon-lib').Deconstruction;
var Mapping = require('d3-decon-lib').Mapping;
var fs = require('fs');
var _ = require('lodash');
var assert = require('assert');
var clone = require('clone');
var ss = require('simple-statistics');
var d3 = require('d3');

var config = require('./config');
var transferTests = require('./tests');

var loadDeconstructedVis = function (filename) {
    var file = fs.readFileSync(filename, 'utf8');
    var decon = JSON.parse(file);
    return Deconstruction.fromJSON(decon);
};

var getSemiologyRanking = function (mapping) {
    if (mapping.type === "linear") {
        return config.semiology_lin[mapping.attr];
    }
    else {
        return config.semiology_nom[mapping.attr];
    }
};

var getMinRanked = function (mappingArray, skipList, requireLinear) {
    if (!skipList) {
        skipList = [];
    }

    var min = Number.MAX_VALUE;
    var minMappings = [];
    _.each(mappingArray, function (mapping) {
        var rank = getSemiologyRanking(mapping);

        var skipNotLinear = requireLinear && mapping.type !== "linear";

        if (rank < min && !_.contains(skipList, mapping) && !skipNotLinear) {
            min = rank;
            minMappings = [mapping];
        }
        else if (rank === min && !_.contains(skipList, mapping)) {
            minMappings.push(mapping);
        }
    });
    return minMappings;
};

var getBestMatchingMapping = function(sourceMapping, targetMappings) {
    var sameTypeMappings = _.filter(targetMappings, function(targetMapping) {
        return targetMapping.type === sourceMapping.type;
    });

    if (sameTypeMappings.length === 1) {
        return sameTypeMappings[0];
    }
    else {
        var sameSortednessMappings = _.filter(sameTypeMappings, function(mapping) {
            if (sourceMapping.data[0] === "deconID") {
                return mapping.data[0] === "deconID";
            }
            return mapping.data[0] !== "deconID";
        });

        if (sameSortednessMappings.length === 1) {
            return sameSortednessMappings[0];
        }
        else {
            var sameAttrMappings = _.filter(sameTypeMappings, function(mapping) {
                return mapping.attr === sourceMapping.attr;
            });
            if (sameAttrMappings.length > 0) {
                return sameAttrMappings[0];
            }
        }
    }
    return targetMappings[0];
};

function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

var transferVisStyle = function(sourceVis, targetVis) {
    sourceVis = applyAxisRanges(sourceVis, sourceVis.axes);
    targetVis = applyAxisRanges(targetVis, targetVis.axes);

    var sourceDataBoundGroups = getDataBoundMarks(sourceVis);
    var targetDataBoundGroups = getDataBoundMarks(targetVis);

    var sourceGroup = _.max(sourceDataBoundGroups, function(group) {
        return group.numFields;
    });
    var targetGroup = _.max(targetDataBoundGroups, function(group) {
        return group.numFields;
    });

    var newGroup = transferStyle(sourceGroup, targetGroup);

    var groups = [newGroup];

    targetVis.axes.forEach(function(axis) {
        //if (axis.scaleRange[0] > axis.scaleRange[1]) {
        //    axis.scaleRange = [axis.scaleRange[1], axis.scaleRange[0]];
        //    axis.scaleDomain = [axis.scaleDomain[1], axis.scaleDomain[0]];
        //}

        newGroup.mappings.forEach(function(mapping) {
            if (arraysEqual(mapping.attrRange, axis.scaleRange)) {
                console.log("found axis overlap");
                var axisGroups = modifyAxisWithMapping(targetVis, mapping, mapping.attr === "xPosition" ? "x" : "y");
                groups = groups.concat(axisGroups);
            }
        });
    });


    //// if x axis maps to x axis
    //if (arraysEqual(sourceGroup.getMappingForAttr('xPosition').dataRange, newGroup.getMappingForAttr('xPosition').dataRange)) {
    //    groups.push(transferStyle(sourceVis.getGroupByName('xaxis-ticks'), targetVis.getGroupByName('xaxis-ticks')));
    //    groups.push(transferStyle(sourceVis.getGroupByName('xaxis-line'), targetVis.getGroupByName('xaxis-line')));
    //    groups.push(transferStyle(sourceVis.getGroupByName('xaxis-labels'), targetVis.getGroupByName('xaxis-labels')));
    //}
    //else {
    //    groups.push(transferStyle(sourceVis.getGroupByName('xaxis-ticks'), targetVis.getGroupByName('yaxis-ticks')));
    //    groups.push(transferStyle(sourceVis.getGroupByName('xaxis-line'), targetVis.getGroupByName('yaxis-line')));
    //    groups.push(transferStyle(sourceVis.getGroupByName('xaxis-labels'), targetVis.getGroupByName('yaxis-labels')));
    //}
    //if (arraysEqual(sourceGroup.getMappingForAttr('yPosition').dataRange, newGroup.getMappingForAttr('yPosition').dataRange)) {
    //    groups.push(transferStyle(sourceVis.getGroupByName('yaxis-ticks'), targetVis.getGroupByName('yaxis-ticks')));
    //    groups.push(transferStyle(sourceVis.getGroupByName('yaxis-line'), targetVis.getGroupByName('yaxis-line')));
    //    groups.push(transferStyle(sourceVis.getGroupByName('yaxis-labels'), targetVis.getGroupByName('yaxis-labels')));
    //}
    //else {
    //    groups.push(transferStyle(sourceVis.getGroupByName('yaxis-ticks'), targetVis.getGroupByName('xaxis-ticks')));
    //    groups.push(transferStyle(sourceVis.getGroupByName('yaxis-line'), targetVis.getGroupByName('xaxis-line')));
    //    groups.push(transferStyle(sourceVis.getGroupByName('yaxis-labels'), targetVis.getGroupByName('xaxis-labels')));
    //}
    //
    //var newVisAxes = transferAxes(newGroup, sourceVis, targetVis);
    //var groups = [newGroup];
    //groups = groups.concat(newVisAxes);


    var result = new Deconstruction(targetVis.svg, groups);
    return result;
};

var getAxis = function(vis, axis) {
    if (axis === "x") {
        var xAxis = _.filter(vis.axes, function(axis) {return axis.orient === "top" || axis.orient === "bottom"});
        if (xAxis.length > 0) {
            xAxis = clone(xAxis[0]);
        }
        else {
            xAxis = undefined;
        }
        return xAxis;
    }
    else if (axis === "y") {
        var yAxis = _.filter(vis.axes, function(axis) {return axis.orient === "left" || axis.orient === "right"});
        if (yAxis.length > 0) {
            yAxis = clone(yAxis[0]);
        }
        else {
            yAxis = undefined;
        }
        return yAxis;
    }
};

//var transferAxes = function(newGroup, sourceVis, targetVis) {
//    var axisGroups = [];
//
//    var sourceAxis = getAxis(sourceVis, 'x');
//    var targetAxis = getAxis(targetVis, 'x');
//    if (targetAxis) {
//        //var xMapping = Mapping.fromJSON(newGroup.getMappingForAttr("xPosition"));
//        //xAxis.scaleDomain = xMapping.dataRange;
//        //axisGroups = axisGroups.concat(modifyAxisWithMapping(targetVis, xMapping, 'x'));
//        var newAxisDomain = sourceAxis.scaleDomain;
//        var newAxisRange = targetAxis.scaleRange;
//        if (typeof newAxisDomain[0] === "number") {
//            var newScale = d3.scale.linear().domain(newAxisDomain).range(newAxisRange);
//            newScale.ticks.apply(newScale, targetAxis.tickArguments)
//        }
//    }
//
//    sourceAxis = getAxis(sourceVis, 'y');
//    targetAxis = getAxis(targetVis, 'y');
//    if (yAxis) {
//        var yMapping = Mapping.fromJSON(newGroup.getMappingForAttr("yPosition"));
//        yAxis.scaleDomain = yMapping.dataRange;
//        axisGroups = axisGroups.concat(modifyAxisWithMapping(targetVis, yMapping, 'y'));
//    }
//
//    return axisGroups;
//};
//
var modifyAxisWithMapping = function(targetVis, mapping, axis) {
    var axisLineGroup = clone(targetVis.getGroupByName(axis + 'axis-line'));
    axisLineGroup.getMappingForAttr(axis + "Position").params.coeffs = clone(mapping.params.coeffs);
    for (var i = 0; i < axisLineGroup.attrs[axis + 'Position'].length; ++i) {
        axisLineGroup.data['domain'][i] = mapping.invert(axisLineGroup.attrs[axis + 'Position'][i]);
    }
    axisLineGroup.updateAttrsFromMappings();

    var axisTickGroup = clone(targetVis.getGroupByName(axis + 'axis-ticks'));
    axisTickGroup.getMappingForAttr(axis + "Position").params.coeffs = clone(mapping.params.coeffs);
    for (i = 0; i < axisTickGroup.attrs[axis + 'Position'].length; ++i) {
        axisTickGroup.data['number'][i] = mapping.invert(axisTickGroup.attrs[axis + 'Position'][i]);
    }
    axisTickGroup.updateAttrsFromMappings();

    var axisLabelGroup = clone(targetVis.getGroupByName(axis + 'axis-labels'));
    axisLabelGroup.getMappingForAttr(axis + "Position").params.coeffs = clone(mapping.params.coeffs);
    for (i = 0; i < axisLabelGroup.attrs[axis + 'Position'].length; ++i) {
        axisLabelGroup.data['number'][i] = mapping.invert(axisLabelGroup.attrs[axis + 'Position'][i]);
        axisLabelGroup.nodeAttrs[i].text = Math.round(axisLabelGroup.data['number'][i]).toString();
    }
    axisLabelGroup.updateAttrsFromMappings();

    return [axisLineGroup, axisTickGroup, axisLabelGroup];
};


var applyAxisRanges = function(vis) {
    var xAxis = getAxis(vis, 'x');
    var yAxis = getAxis(vis, 'y');

    for (var i = 0; i < vis.groups.length; ++i) {
        var group = vis.groups[i];
        for (var j = 0; j < group.mappings.length; ++j) {
            var mapping = group.mappings[j];
            if (xAxis && mapping.attr === "xPosition" && group.name !== "yaxis-line") {
                //TODO update to only set this as range if subset
                mapping.dataRange = xAxis.scaleDomain;
                mapping.attrRange = xAxis.scaleRange;
            }
            else if (yAxis && mapping.attr === "yPosition" && group.name !== "xaxis-line") {
                mapping.dataRange = yAxis.scaleDomain;
                mapping.attrRange = yAxis.scaleRange;
            }
        }
    }
    return vis;
};

var getDataBoundMarks = function(vis) {
    return _.filter(vis.groups, function(group) {
        return typeof group.axis === "undefined";
    });
};

var transferStyle = function (sourceGroup, targetGroup) {
    var newVis = clone(sourceGroup);
    newVis.mappings = [];

    // These arrays keep track of already processed mappings so we don't try to transfer
    // them if they've already been dealt with.
    var sourceProcessedMappings = [];
    var targetProcessedMappings = [];

    while (sourceProcessedMappings.length < sourceGroup.mappings.length) {
        var sourceNextMappings = getMinRanked(sourceGroup.mappings, sourceProcessedMappings);
        var targetNextMappings = getMinRanked(targetGroup.mappings, targetProcessedMappings);

        // Since we're basing the loop on source mappings, make sure to still break if we run out of target mappings
        if (targetNextMappings.length === 0) {
            break;
        }

        // For each of the highest ranked source mappings, we'll find its best match on the highest ranked target mappings.
        _.each(sourceNextMappings, function(sourceMapping) {
            targetNextMappings = getMinRanked(targetGroup.mappings, targetProcessedMappings);
            if (targetNextMappings.length === 0) {
                return;
            }

            var targetMapping = getBestMatchingMapping(sourceMapping, targetNextMappings);
            var newMapping = transferMapping(sourceMapping, targetMapping, sourceGroup, targetGroup);
            if (newMapping)
                newVis.mappings.push(newMapping);

            sourceProcessedMappings.push(sourceMapping);
            targetProcessedMappings.push(targetMapping);

            if (sourceMapping.type !== "nominal" && targetMapping.type !== "nominal") {
                var propagated = propagateMappings(newMapping, sourceMapping, targetMapping,
                    sourceProcessedMappings, targetProcessedMappings, sourceGroup, targetGroup);
                newVis.mappings = newVis.mappings.concat(propagated);
            }
        });
    }
    transferUnmapped(targetGroup, newVis);
    newVis.updateAttrsFromMappings();
    return newVis;

    //
    //while (sourceProcessedMappings.length < sourceGroup.mappings.length) {
    //    var sourceNextMapping = getMinRanked(sourceGroup.mappings, sourceProcessedMappings);
    //    var targetNextMapping;
    //
    //    if (sourceNextMapping.type === "linear") {
    //        targetNextMapping = getMinRanked(targetGroup.mappings, targetProcessedMappings, true);
    //    }
    //    else {
    //        targetNextMapping = getMinRanked(targetGroup.mappings, targetProcessedMappings);
    //    }
    //
    //    if (!targetNextMapping) {
    //        break;
    //    }
    //
    //    var newMapping = transferMapping(sourceNextMapping, targetNextMapping, sourceGroup, targetGroup);
    //    if (newMapping)
    //        newVis.mappings.push(newMapping);
    //
    //    sourceProcessedMappings.push(sourceNextMapping);
    //    targetProcessedMappings.push(targetNextMapping);
    //
    //    if (sourceNextMapping.type !== "nominal" && targetNextMapping.type !== "nominal") {
    //        var propagated = propagateMappings(newMapping, sourceNextMapping, targetNextMapping, sourceProcessedMappings, targetProcessedMappings, sourceGroup, targetGroup);
    //        newVis.mappings = newVis.mappings.concat(propagated);
    //    }
    //}
    //transferUnmapped(targetGroup, newVis);
    //
    //return newVis;
};

var propagateMappings = function (newMapping, sourceNextMapping, targetNextMapping, sourceProcessedMappings, targetProcessedMappings, sourceVis, targetVis) {
    var propagatedMappings = [];

    // find other target mappings with the same data field
    var sameDataMappings = [];
    _.each(targetVis.mappings, function (mapping) {
        if (mapping.data[0] === targetNextMapping.data[0]
            && mapping.type === "linear"
            && !_.contains(targetProcessedMappings, mapping)) {

            sameDataMappings.push(mapping);
        }
    });

    _.each(sameDataMappings, function (mapping) {
        var rel = findRelationship(targetNextMapping, mapping);
        var newMappingCoeffs = propagateCoeffs(newMapping, rel);
        var newPropagatedMapping = new Mapping(sourceNextMapping.data, mapping.attr, "linear", {coeffs: newMappingCoeffs});
        propagatedMappings.push(newPropagatedMapping);
        targetProcessedMappings.push(mapping);
    });

    _.each(sourceVis.mappings, function (mapping) {
        if (mapping.data[0] === sourceNextMapping.data[0]
            && mapping.type === "linear"
            && !_.contains(sourceProcessedMappings, mapping)) {

            sourceProcessedMappings.push(mapping);
        }
    });
    return propagatedMappings;
};

var getNonDerivedMappings = function(mappingList) {
    var nonDerived = [];
    _.each(mappingList, function (mapping, i) {
        if (mapping.type === "linear") {
            if (mapping.data[0] !== "deconID" && mapping.data[0] !== "lineID") {
                nonDerived.push(mapping);
            }
        }
    });
    return nonDerived;
};

var transferMapping = function (sourceMapping, targetMapping, sourceVis, targetVis) {
    var sourceNonDerived = getNonDerivedMappings(sourceVis.getMappingsForAttr(sourceMapping.attr));
    var targetNonDerived = getNonDerivedMappings(targetVis.getMappingsForAttr(targetMapping.attr));
    if (sourceMapping.data[0] === "deconID") {
        sourceMapping = sourceNonDerived.length > 0 ? sourceNonDerived[0] : sourceMapping;
    }
    if (targetMapping.data[0] === "deconID") {
        targetMapping = targetNonDerived.length > 0 ? targetNonDerived[0] : targetMapping;
    }


    var sourceScale = getScale(sourceVis, sourceMapping);
    var targetScale = getScale(targetVis, targetMapping);
    if (sourceMapping.type === "linear" && targetMapping.type == "linear") {
        // If enabled, we'll transfer layouts with regular intervals by hacking deconID mappings
        if (config.regular_interval_layout) {
            if(sourceNonDerived.length == 0 && targetNonDerived.length == 0) {
                var newMapping = transferIntervalMapping(sourceMapping, targetMapping, sourceVis, targetVis);
                if (newMapping) {
                    return newMapping;
                }
            }
        }

        return transferMappingLinear(sourceMapping, targetMapping, sourceScale, targetScale);
    }
    else if(sourceMapping.type === "nominal" && targetMapping.type == "nominal") {
        var newMapping = transferMappingNominal(sourceMapping, targetMapping);
        return newMapping;
    }
};

var transferMappingNominal = function(sourceMapping, targetMapping) {
    var newMapping = new Mapping(sourceMapping.data, targetMapping.attr, "nominal", {});
    var params = {};
    var sourceDataVals = _.keys(sourceMapping.params);
    var targetDataVals = _.keys(targetMapping.params);

    for (var i = 0; i < sourceDataVals.length; ++i) {
        if (targetDataVals.length < i + 1) {
            var rChannel = Math.random() % 255;
            var gChannel = Math.random() % 255;
            var bChannel = Math.random() % 255;
            var newAttrVal = "rgb(" + rChannel.toString() + "," + gChannel.toString() + "," + bChannel.toString() + ")";
            params[sourceDataVals[i]] = newAttrVal;
        }
        else {
            params[sourceDataVals[i]] = targetMapping.map(targetDataVals[i]);
        }
    }

    newMapping.params = params;


    return newMapping;
};

var getScale = function(vis, mapping) {
    var attrRange;
    var dataRange;

    if (mapping.attrRange && mapping.dataRange) {
        attrRange = mapping.attrRange;
        dataRange = mapping.dataRange;

        if (attrRange[0] > attrRange[1]) {
            attrRange = [mapping.attrRange[1], mapping.attrRange[0]];
            dataRange = [mapping.dataRange[1], mapping.dataRange[0]];
        }
    }
    else {
        var bbox = vis.getMarkBoundingBox();
        if (mapping.attr == "yPosition") {
            attrRange = [bbox.y + bbox.height, bbox.y];
            dataRange = [mapping.invert(attrRange[0]), mapping.invert(attrRange[1])];
        }
        else if (mapping.attr == "xPosition") {
            attrRange = [bbox.x, bbox.x + bbox.width];
            dataRange = [mapping.invert(attrRange[0]), mapping.invert(attrRange[1])];
        }
        else if (mapping.attr == "width") {
            attrRange = [0, bbox.width];
            dataRange = [mapping.invert(attrRange[0]), mapping.invert(attrRange[1])];
        }
        else if (mapping.attr == "height") {
            attrRange = [0, bbox.height];
            dataRange = [mapping.invert(attrRange[0]), mapping.invert(attrRange[1])];
        }
    }

    return {
        attrRange: attrRange,
        dataRange: dataRange
    };
};


var transferIntervalMapping = function (sourceMapping, targetMapping, sourceVis, targetVis) {
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
        var mapping = new Mapping(sourceMapping.data, targetMapping.attr, 'linear', params);
        mapping.dataRange = sourceMapping.dataRange;
        if (targetMapping.attrRange)
        mapping.attrRange = [
            targetMapping.attrRange[0],
            (targetMapping.attrRange[1]  / targetAttrVals.length) * sourceAttrVals.length
        ];
        return mapping;
    }
};

var getArrayInterval = function (arr) {
    var EPSILON = Math.pow(2, -8);

    function epsEqu(x, y) {
        return Math.abs(x - y) < EPSILON;
    }

    var data = clone(arr);
    data.sort(function (a, b) {
        return a - b
    });

    var interval = null;
    for (var i = 1; i < data.length; ++i) {
        var currInterval = data[i] - data[i - 1];
        if (!interval) {
            interval = currInterval;
        }
        else if (!epsEqu(interval, currInterval)) {
            return null;
        }
    }
    return interval;
};

var transferUnmapped = function (sourceVis, transferredVis) {
    var mappedAttrs = _.map(transferredVis.mappings, function (mapping) {
        return mapping.attr;
    });
    mappedAttrs = _.uniq(mappedAttrs);

    _.each(sourceVis.attrs, function (valArray, attr) {
        if (!_.contains(mappedAttrs, attr)) {
            for (var i = 0; i < transferredVis.attrs[attr].length; ++i) {
                transferredVis.attrs[attr][i] = valArray[0];
            }
        }
    });

    for (var i = 0; i < transferredVis.nodeAttrs.length; ++i) {
        for (var nodeAttr in sourceVis.nodeAttrs[0]) {
            if (nodeAttr !== "text" && nodeAttr !== "fill" && nodeAttr !== "stroke" && nodeAttr !== "opacity") {
                transferredVis.nodeAttrs[i][nodeAttr] = sourceVis.nodeAttrs[0][nodeAttr];
            }
        }
    }
};

var getLinearCoeffs = function (pairs) {
    var line = ss.linear_regression()
        .data(pairs);
    return [line.m(), line.b()];
};

var transferMappingLinear = function (sourceMapping, targetMapping, sourceScale, targetScale) {
    var newMapping = {
        type: "linear",
        data: sourceMapping.data,
        attr: targetMapping.attr,
        params: {}
    };

    //var sourceMap = new Mapping(sourceMapping.data, sourceMapping.attr, sourceMapping.type, sourceMapping.params);
    newMapping.params.coeffs = getLinearCoeffs([
        [sourceScale.dataRange[0], targetScale.attrRange[0]],
        [sourceScale.dataRange[1], targetScale.attrRange[1]]
    ]);

    newMapping.dataRange = sourceMapping.dataRange;
    newMapping.attrRange = targetMapping.attrRange;

    return Mapping.fromJSON(newMapping);
};

var findRelationship = function (mapping1, mapping2) {
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

var propagateCoeffs = function (mapping, relationship) {
    var a = relationship[0];
    var b = relationship[1];
    var c = mapping.params.coeffs[0];
    var d = mapping.params.coeffs[1];

    var transferredCoeff1 = c * a;
    var transferredCoeff2 = d * a + b;
    return [transferredCoeff1, transferredCoeff2];
};

var replaceMaxMappingRanges = function (decon) {
    decon = replaceMaxMappingRange('xPosition', decon);
    decon = replaceMaxMappingRange('yPosition', decon);
    return decon;
};

//var replaceMaxMappingRange = function (attr, decon) {
//    var allMappings = decon.getAllMappingsForAttr(attr);
//    _.each(allMappings, function (mapping1) {
//        var sameMappings = _.filter(allMappings, function (mapping2) {
//            return mapping2.isEqualTo(mapping1);
//        });
//        var minRangeMapping = _.max(sameMappings, function (mapping) {
//            return mapping.group.getAttrRange(attr)[0];
//        });
//        var maxRangeMapping = _.max(sameMappings, function (mapping) {
//            return mapping.group.getAttrRange(attr)[1];
//        });
//        if (_.isEqual(minRangeMapping, maxRangeMapping)) {
//            var range = minRangeMapping.group.getAttrRange(attr);
//            _.each(sameMappings, function (mapping) {
//                mapping.attrRange = range;
//            });
//        }
//    });
//
//    _.each(allMappings, function (mapping) {
//        delete mapping.group;
//    });
//
//    return decon;
//};

var replaceMaxMappingRange = function(attr, decon) {
    var allMappings = decon.getAllMappingsForAttr(attr);
    var allMappingsSorted = _.sortBy(allMappings, function(mapping) {
        var mappingRange = mapping.group.getAttrRange(attr);
        return Math.abs(mappingRange[1] - mappingRange[0]);
    });
    allMappingsSorted = allMappingsSorted.reverse();

    var mappingSets = [];

    allMappingsSorted.forEach(function(mapping) {
        if (mapping.type == "linear" && mapping.data[0] !== "deconID" && mapping.data[0] !== "tick") {
            var mappingDomain = mapping.group.getDataRange(mapping.data);
            var mappingRange = [mapping.map(mappingDomain[0]), mapping.map(mappingDomain[1])];
            var foundSet = false;

            mappingSets.forEach(function (rangeSet) {
                if (mappingBelongsToRangeSet(mappingDomain, mappingRange, rangeSet)) {
                    rangeSet.mappings.push(mapping);
                    foundSet = true;
                }
            });

            if (!foundSet) {
                mappingSets.push({
                    domain: mappingDomain,
                    range: mappingRange,
                    mappings: [mapping],
                    largest: mapping
                });
            }
        }
    });


    mappingSets.forEach(function(mappingSet) {
        if (mappingSet.mappings.length >= 1) {
            mappingSet.mappings.forEach(function (mapping) {
                mapping.dataRange = mappingSet.domain;
                //mapping.dataRange = mapping.group.getDataRange(mapping.data);
                var minMappedVal = mapping.map(mappingSet.domain[0]);
                var minLargestMappedVal = mappingSet.largest.map(mappingSet.domain[0]);
                var maxMappedVal = mapping.map(mappingSet.domain[1]);
                var maxLargestMappedVal = mappingSet.largest.map(mappingSet.domain[1]);
                var minDifference = Math.abs(minMappedVal - minLargestMappedVal);
                var maxDifference = Math.abs(maxMappedVal - maxLargestMappedVal);

                // if the difference is small, we have the same mapping
                if (minDifference < 2 && maxDifference < 2) {
                    mapping.attrRange = mappingSet.range;
                }
                else {
                    // different mapping.  what's the relationship?
                    var relationship = findRelationship(mappingSet.largest, mapping);
                    //var adjustedCoeffs = [mappingSet.largest.coeffs[0] * relationship[0], mappingSet.largest.coeffs[1] + relationship[1]]
                    //mapping.attrRange = [mappingSet.largest.map(mappingSet.domain[0])*relationship[0] + relationship[1],
                    //    mappingSet.largest.map(mappingSet.domain[1])*relationship[0] + relationship[1]];
                    //mapping.attrRange = [mappingSet.largest.map(mapping.dataRange[0]),
                    //    mappingSet.largest.map(mapping.dataRange[1])*relationship[0] + relationship[1]];
                    mapping.attrRange = [mapping.map(mapping.dataRange[0]), mapping.map(mapping.dataRange[1])];
                }
            });
        }
    });

    _.each(decon.getAllMappingsForAttr(attr), function (mapping) {
        delete mapping.group;
    });

    return decon;
};

//var getMappingSets = function(attr, decon) {
//    var allMappings = decon.getAllMappingsForAttr(attr);
//    var allMappingsSorted = _.sortBy(allMappings, function(mapping) {
//        var mappingRange = mapping.group.getAttrRange(attr);
//        return Math.abs(mappingRange[1] - mappingRange[0]);
//    });
//
//    var rangeSets = [];
//
//    allMappingsSorted.forEach(function(mapping) {
//        var mappingDomain = mapping.group.getDataRange(mapping.data);
//        var mappingRange = mapping.group.getAttrRange(attr);
//        var foundSet = false;
//
//        rangeSets.forEach(function(rangeSet) {
//            if (mappingBelongsToRangeSet(mappingDomain, mappingRange, rangeSet)) {
//                rangeSet.mappings.push(mapping);
//            }
//        });
//
//        if (!foundSet) {
//            rangeSets.push({
//                domain: mappingDomain,
//                range: mappingRange,
//                mappings: [mapping],
//                largest: mapping
//            });
//        }
//    });
//    return rangeSets;
//};

var mappingBelongsToRangeSet = function(domain, range, rangeSet) {
    //return rangeOverlaps(rangeSet.range, range) && rangeOverlaps(rangeSet.domain, domain);
    return rangeOverlaps(rangeSet.domain, domain) && rangeOverlaps(rangeSet.range, range);
};

var rangeOverlaps = function(range1, range2) {
    var range1Min = _.min(range1) - 2;
    var range1Max = _.max(range1) + 2;
    var range2Min = _.min(range2);
    var range2Max = _.max(range2);

    return (range1Min <= range2Min && range2Min <= range1Max) || (range1Min <= range2Max && range2Max <= range1Max);
};

var rangeContains = function(range1, range2) {
    var range1Min = _.min(range1);
    var range1Max = _.max(range1);
    var range2Min = _.min(range2);
    var range2Max = _.max(range2);

    return range1Min <= range2Min + 2 && range1Max >= range2Max - 2;
};

var getTransferSubset = function(deconstruction, transfers) {
    var newDecon = {
        "svg": deconstruction.svg,
        "marks": _.map(transfers, function(transfer) {return deconstruction.getGroupByName(transfer);})
    };
    return new Deconstruction(newDecon.svg, newDecon.marks, []);
};

var main = function () {
    _.each(transferTests, function (test, testName) {
        //var sourceDecon = loadDeconstructedVis(test.source_file);
        //var targetDecon = loadDeconstructedVis(test.target_file);

        test.sourceDecon = JSON.parse(fs.readFileSync(test.source_file, 'utf8'));
        test.sourceDecon = Deconstruction.fromJSON(test.sourceDecon);
        test.targetDecon = JSON.parse(fs.readFileSync(test.target_file, 'utf8'));
        test.targetDecon = Deconstruction.fromJSON(test.targetDecon);

        //var sourceDecon = getTransferSubset(test.sourceDecon, _.map(test.transfers, function(transfer) {return transfer[0];}));
        //var targetDecon = getTransferSubset(test.targetDecon, _.map(test.transfers, function(transfer) {return transfer[1];}));
        //sourceDecon = replaceMaxMappingRanges(sourceDecon);
        //targetDecon = replaceMaxMappingRanges(targetDecon);

        test.result = transferVisStyle(test.sourceDecon, test.targetDecon);
        //
        //_.each(test.transfers, function (transfer) {
        //    var result = transferStyle(
        //        sourceDecon.getGroupByName(transfer[0]),
        //        targetDecon.getGroupByName(transfer[1])
        //    );
        //    test.result.groups.push(result);
        //});
    });
    fs.writeFile('view/data/next.json', JSON.stringify(transferTests));
};

if (require.main === module) {
    main();
}

module.exports = {
    loadDeconstructedVis: loadDeconstructedVis,
    transferStyle: transferStyle
};