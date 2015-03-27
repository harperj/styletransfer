/**
 * Created by harper on 11/25/14.
 */

var Deconstruct = require('d3-decon-lib').Deconstruct;
var Deconstruction = require('d3-decon-lib').Deconstruction;
var Mapping = require('d3-decon-lib').Mapping;
var fs = require('fs');
var _ = require('lodash');
var assert = require('assert');
var clone = require('clone');
var ss = require('simple-statistics');
var d3 = require('d3');
var CircularJSON = require('circular-json');

var config = require('./config');
var transferTests = require('./tests');

var getSemiologyRanking = function (mapping) {
    if (mapping.type === "linear") {
        return config.semiology_lin[mapping.attr];
    }
    else {
        return config.semiology_nom[mapping.attr];
    }
};

var getMinRanked = function (mappingArray, skipList, requireLinear, skipListType) {
    if (!skipList) {
        skipList = [];
    }

    var min = Number.MAX_VALUE;
    var minMappings = [];
    _.each(mappingArray, function (mapping) {
        var rank = getSemiologyRanking(mapping);

        var skipNotLinear = requireLinear && mapping.type !== "linear";

        var skipListContained = false;
        if (skipListType === "data") {
            skipListContained = _.includes(skipList, mapping.data[0]);
        }
        else {
            skipListContained = _.includes(skipList, mapping.attr)
        }

        if (rank < min && !skipListContained && !skipNotLinear) {
            min = rank;
            minMappings = [mapping];
        }
        else if (rank === min && !skipListContained) {
            minMappings.push(mapping);
        }
    });
    return minMappings;
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
        var axisDrawn = false;

        newGroup.mappings.forEach(function(mapping) {
            if (mappingWithinAxis(mapping, axis) && !axisDrawn) {
                axisDrawn = true;
                console.log("found axis overlap");
                var axisGroups = modifyAxisWithMapping(targetVis, mapping, mapping.attr === "xPosition" ? "x" : "y", axis, newGroup);
                groups = groups.concat(axisGroups);
            }
            else if (mappingExtendedAxis(mapping, axis, targetVis) && !axisDrawn) {
                axisDrawn = true;
                var extendedAxisGroups = extendAxisGroups(axis, mapping, sourceVis, targetVis);
                groups = groups.concat(extendedAxisGroups);

            }
        });
    });

    var result = new Deconstruction(targetVis.svg, groups);
    result.svg = result.getMarkBoundingBox(targetVis.svg);
    return result;
};

var mappingExtendedAxis = function(mapping, axis) {
    var axisAttr = axis.orient === "left" || axis.orient === "right" ? "yPosition" : "xPosition";
    if (mapping.params.interval && axisAttr === mapping.attr) {
        return true;
    }
};

var mappingWithinAxis = function(mapping, axis) {
    var rangeContained = rangeContains(axis.scaleRange, mapping.attrRange);
    var axisAttr = axis.orient === "left" || axis.orient === "right" ? "yPosition" : "xPosition";
    return mapping.attr === axisAttr && rangeContained;
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
var modifyAxisWithMapping = function(targetVis, newMapping, axis, axisObj, newGroup) {
    var range = newMapping.axisAttrRange ? newMapping.axisAttrRange : newMapping.attrRange;
    var domain = newMapping.axisDataRange ? newMapping.axisDataRange : newMapping.dataRange;
    var targetAxisMapping = new Mapping("mappingData", "mappingAttr", "linear", {}, domain, range);
    targetAxisMapping.params.coeffs = getLinearCoeffs([[domain[0], range[0]], [domain[1], range[1]]]);
    var axisLineGroup = clone(targetVis.getGroupByName(axis + 'axis-line'));
    var axisTickGroup = clone(targetVis.getGroupByName(axis + 'axis-ticks'));
    var axisLabelGroup = clone(targetVis.getGroupByName(axis + 'axis-labels'));


    if (axisObj.orient === "bottom") {
        var newGroupBBox = newGroup.getMarkBoundingBox();
        var newGroupMax = newGroupBBox.y + newGroupBBox.height;
        var axisLineBBox = axisLineGroup.getMarkBoundingBox();
        var axisLineMin = axisLineBBox.y;
        var targetGroupBBox = newMapping.targetGroup.getMarkBoundingBox();
        var padding = axisLineMin - (targetGroupBBox.y + targetGroupBBox.height);

        if (newGroupMax > axisLineMin) {
            axisTickGroup.attrs['yPosition'] = _.map(axisTickGroup.attrs['yPosition'], function(yPos) {return yPos + (newGroupMax - axisLineMin) + padding;});
            axisLabelGroup.attrs['yPosition'] = _.map(axisLabelGroup.attrs['yPosition'], function(yPos) {return yPos + (newGroupMax - axisLineMin) + padding;});
            axisLineGroup.attrs['yPosition'] = _.map(axisLineGroup.attrs['yPosition'], function(yPos) {return yPos + (newGroupMax - axisLineMin) + padding;});
            axisLineGroup.getMapping('tick', 'yPosition').params.coeffs[1] += (newGroupMax - axisLineMin) + padding;
        }
    }

    axisLineGroup.getMappingForAttr(axis + "Position").params.coeffs = clone(targetAxisMapping.params.coeffs);
    for (var i = 0; i < axisLineGroup.attrs[axis + 'Position'].length; ++i) {
        axisLineGroup.data['domain'][i] = targetAxisMapping.invert(axisLineGroup.attrs[axis + 'Position'][i]);
    }
    axisLineGroup.updateAttrsFromMappings();

    axisTickGroup.getMappingForAttr(axis + "Position").params.coeffs = clone(targetAxisMapping.params.coeffs);
    for (i = 0; i < axisTickGroup.attrs[axis + 'Position'].length; ++i) {
        axisTickGroup.data['number'][i] = targetAxisMapping.invert(axisTickGroup.attrs[axis + 'Position'][i]);
    }
    axisTickGroup.updateAttrsFromMappings();

    axisLabelGroup.getMappingForAttr(axis + "Position").params.coeffs = clone(targetAxisMapping.params.coeffs);
    for (i = 0; i < axisLabelGroup.attrs[axis + 'Position'].length; ++i) {
        axisLabelGroup.data['number'][i] = targetAxisMapping.invert(axisLabelGroup.attrs[axis + 'Position'][i]);
    }

    for (i = 0; i < axisLabelGroup.attrs[axis + 'Position'].length; ++i) {
        if (_.max(axisLabelGroup.data['number']) < 5)
            axisLabelGroup.nodeAttrs[i].text = (Math.round(axisLabelGroup.data['number'][i] * 100) / 100).toString();
        else {
            axisLabelGroup.nodeAttrs[i].text = Math.round(axisLabelGroup.data['number'][i]).toString();
        }
    }

    axisLabelGroup.updateAttrsFromMappings();

    return [axisLineGroup, axisTickGroup, axisLabelGroup];
};

var extendAxisGroups = function(axis, mapping, sourceVis, targetVis) {
    var axisTickGroup = clone(targetVis.getGroupByName(axis.axis + '-ticks'));
    axisTickGroup = extendTicks(axisTickGroup, axis, mapping, targetVis);

    var axisLabelGroup = clone(targetVis.getGroupByName(axis.axis + '-labels'));
    axisLabelGroup = extendLabels(axisLabelGroup, axis, mapping);
    //var targetAxisLabelGroup = clone(targetVis.getGroupByName(axis.axis + '-labels'));
    //axisLabelGroup = transferStyle(axisLabelGroup, targetAxisLabelGroup);
    //for (i = 0; i < axisLabelGroup.attrs[axis.axis[0] + 'Position'].length; ++i) {
    //    axisLabelGroup.nodeAttrs[i] = clone(targetAxisLabelGroup.nodeAttrs[0]);
    //    axisLabelGroup.nodeAttrs[i].text = mapping.dataRange[i];
    //}

    var axisLineGroup = clone(targetVis.getGroupByName(axis.axis + '-line'));

    var interval = mapping.params.interval;
    var length = mapping.params.interval * (mapping.dataRange.length - 1);
    length += mapping.params.interval / 4;

    var oldMinVal = _.min(axisLineGroup.attrs[axis.axis[0] + 'Position']);
    var oldMaxVal = _.max(axisLineGroup.data['axis']);
    var newMaxVal = oldMinVal + length;
    for (var i = 0; i < axisLineGroup.attrs[axis.axis[0] + 'Position'].length; ++i) {
        if (axisLineGroup.data['axis'][i] === oldMaxVal) {
            axisLineGroup.data['axis'][i] = newMaxVal;
        }
    }
    axisLineGroup.updateAttrsFromMappings();

    return [axisLineGroup, axisTickGroup, axisLabelGroup];
};

var extendTicks = function(tickGroup, axis, mapping, targetVis) {
    var tickValues = mapping.dataRange;
    var maxDeconID = _.max(tickGroup.ids);
    var deconInterval = tickGroup.ids[1]-tickGroup.ids[0];

    while (tickGroup.ids.length > tickValues.length) {
        tickGroup.removeLastDataRow();
    }
    while (tickGroup.ids.length < tickValues.length) {
        tickGroup.addData({
            string: tickValues[0],
            deconID: maxDeconID + deconInterval
        });
        maxDeconID += deconInterval;
    }

    for (var i = 0; i < tickGroup.ids.length; ++i) {
        tickGroup.data["string"][i] = tickValues[i];
        var axisAttr = axis.axis[0] + "Position";
        tickGroup.attrs[axisAttr][i] = tickGroup.getMappingForAttr(axisAttr).map(tickGroup.ids[i]);
    }

    tickGroup.updateAttrsFromMappings();

    return tickGroup;
};

var extendLabels = function(labelGroup, axis, mapping, targetVis) {
    var labelValues = mapping.dataRange;
    var maxDeconID = _.max(labelGroup.ids);
    var deconInterval = labelGroup.ids[1]-labelGroup.ids[0];

    while (labelGroup.ids.length > labelValues.length) {
        labelGroup.removeLastDataRow();
    }
    while (labelGroup.ids.length < labelValues.length) {
        labelGroup.addData({
            string: labelValues[0],
            deconID: maxDeconID + deconInterval
        });
        maxDeconID += deconInterval;
    }

    for (var i = 0; i < labelGroup.ids.length; ++i) {
        labelGroup.data["string"][i] = labelValues[i];
        var axisAttr = axis.axis[0] + "Position";
        labelGroup.attrs[axisAttr][i] = labelGroup.getMappingForAttr(axisAttr).map(labelGroup.ids[i]);
        labelGroup.nodeAttrs[i].text = labelValues[i];
    }

    labelGroup.mappings = Deconstruct.extractMappings(labelGroup);
    labelGroup.updateAttrsFromMappings();
    labelGroup.resetNonMapped();

    return labelGroup;
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
                //mapping.attrRange = yAxis.scaleRange;
                if (mapping.dataRange.length === 2 && !isNaN(+mapping.dataRange[0]) && !isNaN(+mapping.dataRange[1])) {
                    mapping.attrRange = [mapping.map(mapping.dataRange[0]), mapping.map(mapping.dataRange[1])];
                    mapping.axisAttrRange = xAxis.scaleRange;
                    mapping.axisDataRange = xAxis.scaleDomain;
                }
                else {
                    mapping.attrRange = xAxis.scaleRange;
                    mapping.axisAttrRange = xAxis.scaleRange;
                    mapping.axisDataRange = xAxis.scaleDomain;
                }
            }
            else if (yAxis && mapping.attr === "yPosition" && group.name !== "xaxis-line") {
                mapping.dataRange = yAxis.scaleDomain;
                //mapping.attrRange = yAxis.scaleRange;
                if (mapping.dataRange.length === 2 && !isNaN(+mapping.dataRange[0]) && !isNaN(+mapping.dataRange[1])) {
                    mapping.attrRange = [mapping.map(mapping.dataRange[0]), mapping.map(mapping.dataRange[1])];
                    mapping.axisAttrRange = yAxis.scaleRange;
                    mapping.axisDataRange = yAxis.scaleDomain;
                }
                else {
                    mapping.attrRange = yAxis.scaleRange;
                    mapping.axisAttrRange = yAxis.scaleRange;
                    mapping.axisDataRange = yAxis.scaleDomain;
                }
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
    var sourceProcessedData = [];
    var targetProcessedAttrs= [];

    var sourceMappedData = _.uniq(_.map(sourceGroup.mappings, function(mapping) { return mapping.data[0]; }));
    var targetMappedAttrs = _.uniq(_.map(targetGroup.mappings, function(mapping) { return mapping.attr; }));

    while (sourceProcessedData.length < sourceMappedData.length) {
        var sourceNextMappings = getMinRanked(sourceGroup.mappings, sourceProcessedData, false, "data");
        var targetNextMappings = getMinRanked(targetGroup.mappings, targetProcessedAttrs, false, "attr");

        // Since we're basing the loop on source mappings, make sure to still break if we run out of target mappings
        if (targetNextMappings.length === 0) {
            break;
        }

        // For each of the highest ranked source mappings, we'll find its best match on the highest ranked target mappings.
        _.each(sourceNextMappings, function(sourceMapping) {
            targetNextMappings = getMinRanked(targetGroup.mappings, targetProcessedAttrs, false, "attr");
            if (targetNextMappings.length === 0) {
                return;
            }

            var targetMapping = getBestMatchingMapping(sourceMapping, targetNextMappings);
            var newMapping = transferMapping(sourceMapping, targetMapping, sourceGroup, targetGroup);
            newMapping.sourceGroup = sourceGroup;
            newMapping.targetGroup = targetGroup;

            if (newMapping)
                newVis.mappings.push(newMapping);

            sourceProcessedData.push(sourceMapping.data[0]);
            targetProcessedAttrs.push(targetMapping.attr);

            if (sourceMapping.type !== "nominal" && targetMapping.type !== "nominal") {
                var propagated = propagateMappings(newMapping, sourceMapping, targetMapping,
                    sourceProcessedData, targetProcessedAttrs, sourceGroup, targetGroup);
                newVis.mappings = newVis.mappings.concat(propagated);
            }
        });
    }
    transferUnmapped(targetGroup, newVis);
    newVis.updateAttrsFromMappings();
    return newVis;
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

var getNonAxisGroups = function(decon) {
    return _.filter(decon.groups, function(group) {
        return !group.axis;
    });
};

var getRankedDataFields = function(sourceDecon) {
    var nonAxisGroups = getNonAxisGroups(sourceDecon);
    var sourceMappings = _.map(nonAxisGroups, function(group) {
        return _.map(group.mappings, function(mapping) {
            mapping.group = group;
            return mapping;
        });
    });

    var mappingsByDataField = _.groupBy(_.flatten(sourceMappings), function(mapping) {return mapping.type === "linear" ? mapping.data[0] : mapping.data; });
    var dataFieldsRanked = _.map(mappingsByDataField, function(mappings, fieldName) {
        var maxRankMapping = _.min(mappings, function(mapping) {
            return getSemiologyRanking(mapping);
        });

        var dataRange;
        if (maxRankMapping.type === "linear") {
            dataRange = [maxRankMapping.invert(maxRankMapping.attrRange[0]), maxRankMapping.invert(maxRankMapping.attrRange[1])];
        }
        else {
            dataRange = _.keys(maxRankMapping.params);
        }

        return {
            fieldName: fieldName,
            rank: getSemiologyRanking(maxRankMapping),
            mappingType: maxRankMapping.type,
            dataRange: dataRange,
            group: maxRankMapping.group
        };
    });
    dataFieldsRanked = _.sortBy(dataFieldsRanked, function(dataField) {
        return dataField.rank;
    });
    return dataFieldsRanked;
};

var getRankedMappings = function(targetVis) {
    var targetMappings = _.map(getNonAxisGroups(targetVis), function(group) {
        return _.map(group.mappings, function(mapping) {
            mapping.group = group;
            return mapping;
        });
    });

    targetMappings = _.flatten(targetMappings);

    var rankedMappings = _.map(targetMappings, function(mapping) {
        mapping.rank = getSemiologyRanking(mapping);
        return mapping;
    });
    return _.sortBy(rankedMappings, function(mapping) { return mapping.rank; });
};

var getHighestRanked = function(rankedList, skipList) {
    var remainingList = _.filter(rankedList, function(item) {
        return _.contains(skipList, item);
    });

    var highestRank = _.min(remainingList, function(item) { return item.rank; });
    var highestRanked = _.filter(remainingList, function(item) { return item.rank === highestRank;});
    return highestRanked;
};


var getBestMatchingMapping = function(sourceField, targetMappings) {
    var sameTypeMappings = _.filter(targetMappings, function(targetMapping) {
        return targetMapping.type === sourceField.mappingType;
    });

    if (sameTypeMappings.length === 1) {
        return sameTypeMappings[0];
    }
    else if(sourceField.mappingType === "linear") {
        return targetMappings[0];
    }
    else {
        return null;
    }
};

var transferMappings = function (sourceVis, targetVis) {
    // Rank source data, target mappings.  Filter out axes and deconID mappings.
    var rankedSourceData = getRankedDataFields(sourceVis);
    rankedSourceData = _.filter(rankedSourceData, function(dataField) { return dataField.fieldName !== "deconID"; });
    var rankedTargetMappings = getRankedMappings(targetVis);
    rankedTargetMappings = _.filter(rankedTargetMappings, function(mapping) {
        return mapping.type === "linear" ? mapping.data[0] !== "deconID" : mapping.data !== "deconID";
    });


    var transferredData = [];
    var transferredMappings = [];

    var newMappings = [];

    for (var i = 0; i < rankedSourceData.length; ++i) {
        var sourceDataField = rankedSourceData[i];
        var targetMapping = getHighestRankedMatch(sourceDataField, rankedTargetMappings, transferredMappings);
        if (targetMapping) {
            var newMapping = transferMapping(sourceDataField, targetMapping);
            transferredMappings.push(targetMapping);
            newMappings.push(newMapping);
            var propagated = propagateMappings(newMapping, targetMapping, rankedTargetMappings, transferredMappings);
            newMappings = newMappings.concat(propagated);
        }
    }

    var groupedNewMappings = groupMappingsByTargetGroup(newMappings);
    var groups = [];
    _.each(groupedNewMappings, function(mappingGroup) {
        var newMarkGroup = clone(mappingGroup.mappings[0].sourceGroup);
        newMarkGroup.mappings = clone(mappingGroup.mappings);

        newMarkGroup.data = clone(newMarkGroup.mappings[0].sourceGroup.data);

        newMarkGroup.updateAttrsFromMappings();
        transferUnmapped(mappingGroup.targetGroup, newMarkGroup);
        groups.push(newMarkGroup);
    });


    targetVis.axes.forEach(function(axis) {
        //if (axis.scaleRange[0] > axis.scaleRange[1]) {
        //    axis.scaleRange = [axis.scaleRange[1], axis.scaleRange[0]];
        //    axis.scaleDomain = [axis.scaleDomain[1], axis.scaleDomain[0]];
        //}
        var axisDrawn = false;

        groups[0].mappings.forEach(function(mapping) {
            if (mappingWithinAxis(mapping, axis) && !axisDrawn) {
                axisDrawn = true;
                console.log("found axis overlap");
                var axisGroups = modifyAxisWithMapping(targetVis, mapping, mapping.attr === "xPosition" ? "x" : "y", axis, groups[0]);
                groups = groups.concat(axisGroups);
            }
            else if (mappingExtendedAxis(mapping, axis, targetVis) && !axisDrawn) {
                axisDrawn = true;
                var extendedAxisGroups = extendAxisGroups(axis, mapping, sourceVis, targetVis);
                groups = groups.concat(extendedAxisGroups);

            }
        });
    });

    var newDecon =  new Deconstruction(clone(targetVis.svg), groups);
    newDecon.svg = clone(newDecon.getMarkBoundingBox(targetVis.svg));
    return newDecon;
};

var groupMappingsByTargetGroup = function(mappings) {
    var mappingGroups = [];

    mappings.forEach(function(mapping) {
        var foundGroup = false;
        mappingGroups.forEach(function(mappingGroup) {
            if (mappingGroup.targetGroup === mapping.targetGroup) {
                mappingGroup.mappings.push(mapping);
                foundGroup = true;
            }
        });

        if (!foundGroup) {
            mappingGroups.push({
                targetGroup: mapping.targetGroup,
                mappings: [mapping]
            });
        }
    });

    return mappingGroups;
};

var propagateMappings = function (newMapping, transferredMapping, allMappings, skipList) {
    var propagatedMappings = [];

    var remainingMappings = _.filter(allMappings, function(item) {
        return !_.contains(skipList, item);
    });

    // find other target mappings with the same data field
    var sameDataMappings = _.filter(remainingMappings, function(mapping) {
        var mappingData = mapping.type === "linear" ? mapping.data[0] : mapping.data;
        var transferredMappingData = transferredMapping.type === "linear" ? transferredMapping.data[0] : transferredMapping.data;
        return mappingData === transferredMappingData;
    });
    //_.each(remainingMappings, function (mapping) {
    //    if (mapping.data[0] === targetNextMapping.data[0]
    //        && mapping.type === "linear"
    //        && !_.contains(targetProcessedAttrs, mapping.attr)) {
    //
    //        sameDataMappings.push(mapping);
    //    }
    //});

    _.each(sameDataMappings, function (sameDataMapping) {
        var rel = findRelationship(transferredMapping, sameDataMapping);
        var propagatedMappingCoeffs = propagateCoeffs(newMapping, rel);
        var newPropagatedMapping = new Mapping(newMapping.data, sameDataMapping.attr, "linear", {coeffs: propagatedMappingCoeffs});
        newPropagatedMapping.targetGroup = sameDataMapping.group;
        propagatedMappings.push(newPropagatedMapping);
        skipList.push(transferredMapping);
    });

    return propagatedMappings;
};

var getHighestRankedMatch = function(dataField, mappings, skipList) {
    if (!skipList) {
        skipList = [];
    }

    var remainingList = _.filter(mappings, function(item) {
        return !_.contains(skipList, item);
    });

    var ranks = _.uniq(_.map(remainingList, function(mapping) {return mapping.rank;})).sort();

    for (var i = 0; i < ranks.length; ++i) {
        var thisRankMappings = _.filter(remainingList, function(item) { return item.rank === ranks[i]; });
        var mapping = getBestMatchingMapping(dataField, thisRankMappings);
        if (mapping) {
            return mapping;
        }
    }

    return undefined;
};

var transferMapping = function (sourceField, targetMapping, sourceVis, targetVis) {
    //var sourceNonDerived = getNonDerivedMappings(sourceVis.getMappingsForAttr(sourceMapping.attr));
    //var targetNonDerived = getNonDerivedMappings(targetVis.getMappingsForAttr(targetMapping.attr));
    //if (sourceMapping.data[0] === "deconID") {
    //    sourceMapping = sourceNonDerived.length > 0 ? sourceNonDerived[0] : sourceMapping;
    //}
    //if (targetMapping.data[0] === "deconID") {
    //    targetMapping = targetNonDerived.length > 0 ? targetNonDerived[0] : targetMapping;
    //}

    //var sourceScale = getScale(sourceVis, sourceMapping);
    //var targetScale = getScale(targetVis, targetMapping);
    if (targetMapping.type == "linear") {
        //// If enabled, we'll transfer layouts with regular intervals by hacking deconID mappings
        //if (config.regular_interval_layout) {
        //    if(sourceNonDerived.length == 0 && targetNonDerived.length == 0) {
        //        var newMapping = transferIntervalMapping(sourceMapping, targetMapping, sourceVis, targetVis);
        //        if (newMapping) {
        //            return newMapping;
        //        }
        //    }
        //}

        return transferMappingLinear(sourceField, targetMapping);
    }
    else if(targetMapping.type == "nominal") {
        var newMapping = transferMappingNominal(sourceField, targetMapping);
        return newMapping;
    }
};

var transferMappingNominal = function(sourceField, targetMapping) {
    var newMapping = new Mapping(sourceField.fieldName, targetMapping.attr, "nominal", {});
    var params = {};
    var sourceDataVals = sourceField.type === "nominal" ? sourceField.dataRange : _.uniq(sourceField.group.data[sourceField.fieldName]);
    var targetDataVals = _.keys(targetMapping.params);

    for (var i = 0; i < sourceDataVals.length; ++i) {
        if (targetDataVals.length < i + 1) {
            var rChannel = Math.round((Math.random() * 255) % 255);
            var gChannel = Math.round((Math.random() * 255) % 255);
            var bChannel = Math.round((Math.random() * 255) % 255);
            var newAttrVal = "rgb(" + rChannel.toString() + "," + gChannel.toString() + "," + bChannel.toString() + ")";
            params[sourceDataVals[i]] = newAttrVal;
        }
        else {
            params[sourceDataVals[i]] = targetMapping.map(targetDataVals[i]);
        }
    }

    newMapping.params = params;
    newMapping.dataRange = sourceDataVals;
    newMapping.attrRange = _.values(params);
    newMapping.targetGroup = targetMapping.group;
    newMapping.sourceGroup = sourceField.group;


    return newMapping;
};

var getScale = function(vis, mapping) {
    var attrRange;
    var dataRange;

    if (mapping.attrRange && mapping.dataRange) {
        attrRange = mapping.attrRange;
        dataRange = mapping.dataRange;

        //if (attrRange[0] > attrRange[1]) {
        //    attrRange = [mapping.attrRange[1], mapping.attrRange[0]];
        //    dataRange = [mapping.dataRange[1], mapping.dataRange[0]];
        //}
    }
    else if (mapping.type === "linear") {
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
            coeffs: coeffs,
            interval: targetInterval,
            dataInterval: sourceDataInterval
        };
        var mapping = new Mapping(sourceMapping.data, targetMapping.attr, 'linear', params);
        if (sourceMapping.dataRange) {
            mapping.dataRange = clone(sourceMapping.dataRange);
        }
        else {
            mapping.dataRange = clone(sourceData);
        }
        //if (targetMapping.attrRange)
        //mapping.attrRange = [
        //    targetMapping.attrRange[0],
        //    (targetMapping.attrRange[1]  / targetAttrVals.length) * sourceAttrVals.length
        //];
        mapping.attrRange = _.map(mapping.dataRange, function(dataItem, i) {
            return params.attrMin + i * params.interval;
        });
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

var transferMappingLinear = function (sourceField, targetMapping) {
    var newMapping = {
        type: "linear",
        data: [sourceField.fieldName],
        attr: targetMapping.attr,
        params: {}
    };

    targetMapping.dataRange = [targetMapping.invert(targetMapping.attrRange[0]), targetMapping.invert(targetMapping.attrRange[1])];

    if (sourceField.dataRange[0] > sourceField.dataRange[1]) {
        //sourceField.attrRange = [sourceField.attrRange[1], sourceField.attrRange[0]];
        sourceField.dataRange = [sourceField.dataRange[1], sourceField.dataRange[0]];
        //sourceField.axisAttrRange = [sourceField.axisAttrRange[1], sourceField.axisAttrRange[0]];
        //sourceField.axisDataRange = [sourceField.axisDataRange[1], sourceField.axisDataRange[0]];
    }
    if (targetMapping.dataRange[0] > targetMapping.dataRange[1]) {
        targetMapping.attrRange = [targetMapping.attrRange[1], targetMapping.attrRange[0]];
        //targetMapping.dataRange = [targetMapping.dataRange[1], targetMapping.dataRange[0]];
        //targetMapping.axisAttrRange = [targetMapping.axisAttrRange[1], targetMapping.axisAttrRange[0]];
        //targetMapping.axisDataRange = [targetMapping.axisDataRange[1], targetMapping.axisDataRange[0]];
    }

    //var sourceMap = new Mapping(sourceMapping.data, sourceMapping.attr, sourceMapping.type, sourceMapping.params);
    newMapping.params.coeffs = getLinearCoeffs([
        [sourceField.dataRange[0], targetMapping.attrRange[0]],
        [sourceField.dataRange[1], targetMapping.attrRange[1]]
    ]);
    newMapping = Mapping.fromJSON(newMapping);
    newMapping.dataRange = sourceField.dataRange;
    newMapping.attrRange = targetMapping.attrRange;
    newMapping.targetGroup = targetMapping.group;
    newMapping.sourceGroup = sourceField.group;
    //
    //var newAxisMapping = new Mapping("data", "attr", "linear", {});
    //newAxisMapping.params.coeffs = getLinearCoeffs([
    //    [sourceField.axisDataRange[0], targetMapping.axisAttrRange[0]],
    //    [sourceField.axisDataRange[1], targetMapping.axisAttrRange[1]]
    //]);
    //
    //newMapping.axisAttrRange = targetMapping.axisAttrRange;
    //newMapping.axisDataRange = [newAxisMapping.invert(targetMapping.axisAttrRange[0]),
    //                            newAxisMapping.invert(targetMapping.axisAttrRange[1])];

    return newMapping;
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
//
//var replaceMaxMappingRanges = function (decon) {
//    decon = replaceMaxMappingRange('xPosition', decon);
//    decon = replaceMaxMappingRange('yPosition', decon);
//    return decon;
//};
//
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
//
//var replaceMaxMappingRange = function(attr, decon) {
//    var allMappings = decon.getAllMappingsForAttr(attr);
//    var allMappingsSorted = _.sortBy(allMappings, function(mapping) {
//        var mappingRange = mapping.group.getAttrRange(attr);
//        return Math.abs(mappingRange[1] - mappingRange[0]);
//    });
//    allMappingsSorted = allMappingsSorted.reverse();
//
//    var mappingSets = [];
//
//    allMappingsSorted.forEach(function(mapping) {
//        if (mapping.type == "linear" && mapping.data[0] !== "deconID" && mapping.data[0] !== "tick") {
//            var mappingDomain = mapping.group.getDataRange(mapping.data);
//            var mappingRange = [mapping.map(mappingDomain[0]), mapping.map(mappingDomain[1])];
//            var foundSet = false;
//
//            mappingSets.forEach(function (rangeSet) {
//                if (mappingBelongsToRangeSet(mappingDomain, mappingRange, rangeSet)) {
//                    rangeSet.mappings.push(mapping);
//                    foundSet = true;
//                }
//            });
//
//            if (!foundSet) {
//                mappingSets.push({
//                    domain: mappingDomain,
//                    range: mappingRange,
//                    mappings: [mapping],
//                    largest: mapping
//                });
//            }
//        }
//    });
//
//
//    mappingSets.forEach(function(mappingSet) {
//        if (mappingSet.mappings.length >= 1) {
//            mappingSet.mappings.forEach(function (mapping) {
//                mapping.dataRange = mappingSet.domain;
//                //mapping.dataRange = mapping.group.getDataRange(mapping.data);
//                var minMappedVal = mapping.map(mappingSet.domain[0]);
//                var minLargestMappedVal = mappingSet.largest.map(mappingSet.domain[0]);
//                var maxMappedVal = mapping.map(mappingSet.domain[1]);
//                var maxLargestMappedVal = mappingSet.largest.map(mappingSet.domain[1]);
//                var minDifference = Math.abs(minMappedVal - minLargestMappedVal);
//                var maxDifference = Math.abs(maxMappedVal - maxLargestMappedVal);
//
//                // if the difference is small, we have the same mapping
//                if (minDifference < 2 && maxDifference < 2) {
//                    mapping.attrRange = mappingSet.range;
//                }
//                else {
//                    // different mapping.  what's the relationship?
//                    var relationship = findRelationship(mappingSet.largest, mapping);
//                    //var adjustedCoeffs = [mappingSet.largest.coeffs[0] * relationship[0], mappingSet.largest.coeffs[1] + relationship[1]]
//                    //mapping.attrRange = [mappingSet.largest.map(mappingSet.domain[0])*relationship[0] + relationship[1],
//                    //    mappingSet.largest.map(mappingSet.domain[1])*relationship[0] + relationship[1]];
//                    //mapping.attrRange = [mappingSet.largest.map(mapping.dataRange[0]),
//                    //    mappingSet.largest.map(mapping.dataRange[1])*relationship[0] + relationship[1]];
//                    mapping.attrRange = [mapping.map(mapping.dataRange[0]), mapping.map(mapping.dataRange[1])];
//                }
//            });
//        }
//    });
//
//    _.each(decon.getAllMappingsForAttr(attr), function (mapping) {
//        delete mapping.group;
//    });
//
//    return decon;
//};
//
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
//
//var mappingBelongsToRangeSet = function(domain, range, rangeSet) {
//    //return rangeOverlaps(rangeSet.range, range) && rangeOverlaps(rangeSet.domain, domain);
//    return rangeOverlaps(rangeSet.domain, domain) && rangeOverlaps(rangeSet.range, range);
//};
//
//var rangeOverlaps = function(range1, range2) {
//    var range1Min = _.min(range1) - 2;
//    var range1Max = _.max(range1) + 2;
//    var range2Min = _.min(range2);
//    var range2Max = _.max(range2);
//
//    return (range1Min <= range2Min && range2Min <= range1Max) || (range1Min <= range2Max && range2Max <= range1Max);
//};
//
var rangeContains = function(range1, range2) {

    if (!range1 || !range2 || range1.length !== 2 || range2.length !== 2) {
        return false;
    }

    var range1Min = _.min(range1);
    var range1Max = _.max(range1);
    var range2Min = _.min(range2);
    var range2Max = _.max(range2);

    return range1Min <= range2Min + 2 && range1Max >= range2Max - 2;
};
//
//var getTransferSubset = function(deconstruction, transfers) {
//    var newDecon = {
//        "svg": deconstruction.svg,
//        "marks": _.map(transfers, function(transfer) {return deconstruction.getGroupByName(transfer);})
//    };
//    return new Deconstruction(newDecon.svg, newDecon.marks, []);
//};

var loadDeconstructedVis = function (filename) {
    var file = fs.readFileSync(filename, 'utf8');
    var decon = JSON.parse(file);
    return Deconstruction.fromJSON(decon);
};


var main = function () {
    _.each(transferTests, function (test) {
        //var sourceDecon = loadDeconstructedVis(test.source_file);
        //var targetDecon = loadDeconstructedVis(test.target_file);

        test.sourceDecon = loadDeconstructedVis(test.source_file);
        test.targetDecon = loadDeconstructedVis(test.target_file);

        test.result = transferMappings(test.sourceDecon, test.targetDecon);
        //test.result = transferVisStyle(test.sourceDecon, test.targetDecon);
    });
    fs.writeFile('view/data/next.json', CircularJSON.stringify(transferTests));
};

if (require.main === module) {
    main();
}

module.exports = {
    loadDeconstructedVis: loadDeconstructedVis,
    transferStyle: transferStyle
};