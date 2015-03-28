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

//function arraysEqual(a, b) {
//    if (a === b) return true;
//    if (a == null || b == null) return false;
//    if (a.length != b.length) return false;
//
//    for (var i = 0; i < a.length; ++i) {
//        if (a[i] !== b[i]) return false;
//    }
//    return true;
//}
//
//var transferVisStyle = function(sourceVis, targetVis) {
//    sourceVis = applyAxisRanges(sourceVis, sourceVis.axes);
//    targetVis = applyAxisRanges(targetVis, targetVis.axes);
//
//    var sourceDataBoundGroups = getDataBoundMarks(sourceVis);
//    var targetDataBoundGroups = getDataBoundMarks(targetVis);
//
//    var sourceGroup = _.max(sourceDataBoundGroups, function(group) {
//        return group.numFields;
//    });
//    var targetGroup = _.max(targetDataBoundGroups, function(group) {
//        return group.numFields;
//    });
//
//    var newGroup = transferStyle(sourceGroup, targetGroup);
//
//    var groups = [newGroup];
//
//    targetVis.axes.forEach(function(axis) {
//        //if (axis.scaleRange[0] > axis.scaleRange[1]) {
//        //    axis.scaleRange = [axis.scaleRange[1], axis.scaleRange[0]];
//        //    axis.scaleDomain = [axis.scaleDomain[1], axis.scaleDomain[0]];
//        //}
//        var axisDrawn = false;
//
//        newGroup.mappings.forEach(function(mapping) {
//            if (mappingWithinAxis(mapping, axis) && !axisDrawn) {
//                axisDrawn = true;
//                console.log("found axis overlap");
//                var axisGroups = modifyAxisWithMapping(targetVis, mapping, mapping.attr === "xPosition" ? "x" : "y", axis, newGroup);
//                groups = groups.concat(axisGroups);
//            }
//            else if (mappingExtendedAxis(mapping, axis, targetVis) && !axisDrawn) {
//                axisDrawn = true;
//                var extendedAxisGroups = extendAxisGroups(axis, mapping, sourceVis, targetVis);
//                groups = groups.concat(extendedAxisGroups);
//
//            }
//        });
//    });
//
//    var result = new Deconstruction(targetVis.svg, groups);
//    result.svg = result.getMarkBoundingBox(targetVis.svg);
//    return result;
//};
//
//var mappingExtendedAxis = function(mapping, axis) {
//    var axisAttr = axis.orient === "left" || axis.orient === "right" ? "yPosition" : "xPosition";
//    if (mapping.params.interval && axisAttr === mapping.attr) {
//        return true;
//    }
//};
//
//var mappingWithinAxis = function(mapping, axis) {
//    var rangeContained = rangeContains(axis.scaleRange, mapping.attrRange);
//    var axisAttr = axis.orient === "left" || axis.orient === "right" ? "yPosition" : "xPosition";
//    return mapping.attr === axisAttr && rangeContained;
//};
//
//var getAxis = function(vis, axis) {
//    if (axis === "x") {
//        var xAxis = _.filter(vis.axes, function(axis) {return axis.orient === "top" || axis.orient === "bottom"});
//        if (xAxis.length > 0) {
//            xAxis = clone(xAxis[0]);
//        }
//        else {
//            xAxis = undefined;
//        }
//        return xAxis;
//    }
//    else if (axis === "y") {
//        var yAxis = _.filter(vis.axes, function(axis) {return axis.orient === "left" || axis.orient === "right"});
//        if (yAxis.length > 0) {
//            yAxis = clone(yAxis[0]);
//        }
//        else {
//            yAxis = undefined;
//        }
//        return yAxis;
//    }
//};

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
//var modifyAxisWithMapping = function(targetVis, newMapping, axis, axisObj, newGroup) {
//    var range = newMapping.axisAttrRange ? newMapping.axisAttrRange : newMapping.attrRange;
//    var domain = newMapping.axisDataRange ? newMapping.axisDataRange : newMapping.dataRange;
//    var targetAxisMapping = new Mapping("mappingData", "mappingAttr", "linear", {}, domain, range);
//    targetAxisMapping.params.coeffs = getLinearCoeffs([[domain[0], range[0]], [domain[1], range[1]]]);
//    var axisLineGroup = clone(targetVis.getGroupByName(axis + 'axis-line'));
//    var axisTickGroup = clone(targetVis.getGroupByName(axis + 'axis-ticks'));
//    var axisLabelGroup = clone(targetVis.getGroupByName(axis + 'axis-labels'));
//
//
//    if (axisObj.orient === "bottom") {
//        var newGroupBBox = newGroup.getMarkBoundingBox();
//        var newGroupMax = newGroupBBox.y + newGroupBBox.height;
//        var axisLineBBox = axisLineGroup.getMarkBoundingBox();
//        var axisLineMin = axisLineBBox.y;
//        var targetGroupBBox = newMapping.targetGroup.getMarkBoundingBox();
//        var padding = axisLineMin - (targetGroupBBox.y + targetGroupBBox.height);
//
//        if (newGroupMax > axisLineMin) {
//            axisTickGroup.attrs['yPosition'] = _.map(axisTickGroup.attrs['yPosition'], function(yPos) {return yPos + (newGroupMax - axisLineMin) + padding;});
//            axisLabelGroup.attrs['yPosition'] = _.map(axisLabelGroup.attrs['yPosition'], function(yPos) {return yPos + (newGroupMax - axisLineMin) + padding;});
//            axisLineGroup.attrs['yPosition'] = _.map(axisLineGroup.attrs['yPosition'], function(yPos) {return yPos + (newGroupMax - axisLineMin) + padding;});
//            axisLineGroup.getMapping('tick', 'yPosition').params.coeffs[1] += (newGroupMax - axisLineMin) + padding;
//        }
//    }
//
//
//    return [axisLineGroup, axisTickGroup, axisLabelGroup];
//};
//
//var extendAxisGroups = function(axis, mapping, sourceVis, targetVis) {
//    var axisTickGroup = clone(targetVis.getGroupByName(axis.axis + '-ticks'));
//    axisTickGroup = extendTicks(axisTickGroup, axis, mapping, targetVis);
//
//    var axisLabelGroup = clone(targetVis.getGroupByName(axis.axis + '-labels'));
//    axisLabelGroup = extendLabels(axisLabelGroup, axis, mapping);
//    //var targetAxisLabelGroup = clone(targetVis.getGroupByName(axis.axis + '-labels'));
//    //axisLabelGroup = transferStyle(axisLabelGroup, targetAxisLabelGroup);
//    //for (i = 0; i < axisLabelGroup.attrs[axis.axis[0] + 'Position'].length; ++i) {
//    //    axisLabelGroup.nodeAttrs[i] = clone(targetAxisLabelGroup.nodeAttrs[0]);
//    //    axisLabelGroup.nodeAttrs[i].text = mapping.dataRange[i];
//    //}
//
//    var axisLineGroup = clone(targetVis.getGroupByName(axis.axis + '-line'));
//
//    var interval = mapping.params.interval;
//    var length = mapping.params.interval * (mapping.dataRange.length - 1);
//    length += mapping.params.interval / 4;
//
//    var oldMinVal = _.min(axisLineGroup.attrs[axis.axis[0] + 'Position']);
//    var oldMaxVal = _.max(axisLineGroup.data['axis']);
//    var newMaxVal = oldMinVal + length;
//    for (var i = 0; i < axisLineGroup.attrs[axis.axis[0] + 'Position'].length; ++i) {
//        if (axisLineGroup.data['axis'][i] === oldMaxVal) {
//            axisLineGroup.data['axis'][i] = newMaxVal;
//        }
//    }
//    axisLineGroup.updateAttrsFromMappings();
//
//    return [axisLineGroup, axisTickGroup, axisLabelGroup];
//};
//
//var extendTicks = function(tickGroup, axis, mapping, targetVis) {
//    var tickValues = mapping.dataRange;
//    var maxDeconID = _.max(tickGroup.ids);
//    var deconInterval = tickGroup.ids[1]-tickGroup.ids[0];
//
//    while (tickGroup.ids.length > tickValues.length) {
//        tickGroup.removeLastDataRow();
//    }
//    while (tickGroup.ids.length < tickValues.length) {
//        tickGroup.addData({
//            string: tickValues[0],
//            deconID: maxDeconID + deconInterval
//        });
//        maxDeconID += deconInterval;
//    }
//
//    for (var i = 0; i < tickGroup.ids.length; ++i) {
//        tickGroup.data["string"][i] = tickValues[i];
//        var axisAttr = axis.axis[0] + "Position";
//        tickGroup.attrs[axisAttr][i] = tickGroup.getMappingForAttr(axisAttr).map(tickGroup.ids[i]);
//    }
//
//    tickGroup.updateAttrsFromMappings();
//
//    return tickGroup;
//};
//
//var extendLabels = function(labelGroup, axis, mapping, targetVis) {
//    var labelValues = mapping.dataRange;
//    var maxDeconID = _.max(labelGroup.ids);
//    var deconInterval = labelGroup.ids[1]-labelGroup.ids[0];
//
//    while (labelGroup.ids.length > labelValues.length) {
//        labelGroup.removeLastDataRow();
//    }
//    while (labelGroup.ids.length < labelValues.length) {
//        labelGroup.addData({
//            string: labelValues[0],
//            deconID: maxDeconID + deconInterval
//        });
//        maxDeconID += deconInterval;
//    }
//
//    for (var i = 0; i < labelGroup.ids.length; ++i) {
//        labelGroup.data["string"][i] = labelValues[i];
//        var axisAttr = axis.axis[0] + "Position";
//        labelGroup.attrs[axisAttr][i] = labelGroup.getMappingForAttr(axisAttr).map(labelGroup.ids[i]);
//        labelGroup.nodeAttrs[i].text = labelValues[i];
//    }
//
//    labelGroup.mappings = Deconstruct.extractMappings(labelGroup);
//    labelGroup.updateAttrsFromMappings();
//    labelGroup.resetNonMapped();
//
//    return labelGroup;
//};
//
//
//var applyAxisRanges = function(vis) {
//    var xAxis = getAxis(vis, 'x');
//    var yAxis = getAxis(vis, 'y');
//
//    for (var i = 0; i < vis.groups.length; ++i) {
//        var group = vis.groups[i];
//        for (var j = 0; j < group.mappings.length; ++j) {
//            var mapping = group.mappings[j];
//            if (xAxis && mapping.attr === "xPosition" && group.name !== "yaxis-line") {
//                //TODO update to only set this as range if subset
//                mapping.dataRange = xAxis.scaleDomain;
//                //mapping.attrRange = yAxis.scaleRange;
//                if (mapping.dataRange.length === 2 && !isNaN(+mapping.dataRange[0]) && !isNaN(+mapping.dataRange[1])) {
//                    mapping.attrRange = [mapping.map(mapping.dataRange[0]), mapping.map(mapping.dataRange[1])];
//                    mapping.axisAttrRange = xAxis.scaleRange;
//                    mapping.axisDataRange = xAxis.scaleDomain;
//                }
//                else {
//                    mapping.attrRange = xAxis.scaleRange;
//                    mapping.axisAttrRange = xAxis.scaleRange;
//                    mapping.axisDataRange = xAxis.scaleDomain;
//                }
//            }
//            else if (yAxis && mapping.attr === "yPosition" && group.name !== "xaxis-line") {
//                mapping.dataRange = yAxis.scaleDomain;
//                //mapping.attrRange = yAxis.scaleRange;
//                if (mapping.dataRange.length === 2 && !isNaN(+mapping.dataRange[0]) && !isNaN(+mapping.dataRange[1])) {
//                    mapping.attrRange = [mapping.map(mapping.dataRange[0]), mapping.map(mapping.dataRange[1])];
//                    mapping.axisAttrRange = yAxis.scaleRange;
//                    mapping.axisDataRange = yAxis.scaleDomain;
//                }
//                else {
//                    mapping.attrRange = yAxis.scaleRange;
//                    mapping.axisAttrRange = yAxis.scaleRange;
//                    mapping.axisDataRange = yAxis.scaleDomain;
//                }
//            }
//        }
//    }
//    return vis;
//};
//
//var getDataBoundMarks = function(vis) {
//    return _.filter(vis.groups, function(group) {
//        return typeof group.axis === "undefined";
//    });
//};
//
//var transferStyle = function (sourceGroup, targetGroup) {
//    var newVis = clone(sourceGroup);
//    newVis.mappings = [];
//
//    // These arrays keep track of already processed mappings so we don't try to transfer
//    // them if they've already been dealt with.
//    var sourceProcessedData = [];
//    var targetProcessedAttrs= [];
//
//    var sourceMappedData = _.uniq(_.map(sourceGroup.mappings, function(mapping) { return mapping.data[0]; }));
//    var targetMappedAttrs = _.uniq(_.map(targetGroup.mappings, function(mapping) { return mapping.attr; }));
//
//    while (sourceProcessedData.length < sourceMappedData.length) {
//        var sourceNextMappings = getMinRanked(sourceGroup.mappings, sourceProcessedData, false, "data");
//        var targetNextMappings = getMinRanked(targetGroup.mappings, targetProcessedAttrs, false, "attr");
//
//        // Since we're basing the loop on source mappings, make sure to still break if we run out of target mappings
//        if (targetNextMappings.length === 0) {
//            break;
//        }
//
//        // For each of the highest ranked source mappings, we'll find its best match on the highest ranked target mappings.
//        _.each(sourceNextMappings, function(sourceMapping) {
//            targetNextMappings = getMinRanked(targetGroup.mappings, targetProcessedAttrs, false, "attr");
//            if (targetNextMappings.length === 0) {
//                return;
//            }
//
//            var targetMapping = getBestMatchingMapping(sourceMapping, targetNextMappings);
//            var newMapping = transferMapping(sourceMapping, targetMapping, sourceGroup, targetGroup);
//            newMapping.sourceGroup = sourceGroup;
//            newMapping.targetGroup = targetGroup;
//
//            if (newMapping)
//                newVis.mappings.push(newMapping);
//
//            sourceProcessedData.push(sourceMapping.data[0]);
//            targetProcessedAttrs.push(targetMapping.attr);
//
//            if (sourceMapping.type !== "nominal" && targetMapping.type !== "nominal") {
//                var propagated = propagateMappings(newMapping, sourceMapping, targetMapping,
//                    sourceProcessedData, targetProcessedAttrs, sourceGroup, targetGroup);
//                newVis.mappings = newVis.mappings.concat(propagated);
//            }
//        });
//    }
//    transferUnmapped(targetGroup, newVis);
//    newVis.updateAttrsFromMappings();
//    return newVis;
//};
//
//var getNonDerivedMappings = function(mappingList) {
//    var nonDerived = [];
//    _.each(mappingList, function (mapping, i) {
//        if (mapping.type === "linear") {
//            if (mapping.data[0] !== "deconID" && mapping.data[0] !== "lineID") {
//                nonDerived.push(mapping);
//            }
//        }
//    });
//    return nonDerived;
//};

var getNonAxisGroups = function(decon) {
    return _.filter(decon.groups, function(group) {
        return !group.axis;
    });
};

var getRankedDataFields = function(groups) {
    //var groups = getNonAxisGroups(sourceDecon);
    var sourceMappings = _.map(groups, function(group) {
        return _.map(group.mappings, function(mapping) {
            mapping.group = group;
            return mapping;
        });
    });

    var mappingsByDataField = _.groupBy(_.flatten(sourceMappings), function(mapping) {return mapping.getData(); });
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

var getRankedMappings = function(groups) {
    var targetMappings = _.map(groups, function(group) {
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

var transferMappings = function(rankedSourceData, rankedTargetMappings) {
    var transferredMappings = [];

    var newMappings = [];

    for (var i = 0; i < rankedSourceData.length; ++i) {
        var sourceDataField = rankedSourceData[i];
        var targetMapping = getHighestRankedMatch(sourceDataField, rankedTargetMappings, transferredMappings);
        if (targetMapping) {
            var newMapping = transferMapping(sourceDataField, targetMapping);
            newMapping.targetAnalog = targetMapping;
            transferredMappings.push(targetMapping);
            newMappings.push(newMapping);
            var propagated = propagateMappings(newMapping, targetMapping, rankedTargetMappings, transferredMappings, sourceDataField);
            newMappings = newMappings.concat(propagated);
        }
    }
    return newMappings;
};

var propagateDataToAxes = function(newMappings, axisGroups, sourceDataFields) {
    newMappings.forEach(function(mapping) {
        var targetDataReplaced = mapping.getData();
        var newDataField = mapping.getData();
        newDataField = _.filter(sourceDataFields, function(dataField) {return dataField.fieldName === newDataField;})[0];

        axisGroups.forEach(function(group) {
            var groupDataFields = _.keys(group.data);
            if (_.contains(groupDataFields, targetDataReplaced)) {
                if (group.replacedData) {
                    group.replacedData[targetDataReplaced] = newDataField;
                }
                else {
                    group.replacedData = {};
                    group.replacedData[targetDataReplaced] = newDataField;
                }
            }
        });
    });

    return axisGroups;
};

var groupMappings = function(newMappings) {
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
    return groups;
};

var isDerived = function(fieldName) {
    var deconReg = /_deriv_*/;
    return fieldName.match(deconReg);
};

var isAxis = function(groupName) {
    var axisReg = /.axis*/;
    if (groupName) {
        return groupName.match(axisReg);
    }
    else {
        return false;
    }
};

var transferChart = function (sourceVis, targetVis) {
    var sourceNonAxisGroups = getNonAxisGroups(sourceVis);
    var targetNonAxisGroups = getNonAxisGroups(targetVis);

    var sourceGroupsByDataCount = _.groupBy(sourceNonAxisGroups, function(group) {return group.data[_.keys(group.data)[0]].length;});
    var targetGroupsByDataCount = _.groupBy(targetNonAxisGroups, function(group) {return group.data[_.keys(group.data)[0]].length; });
    var sourceDataCounts = _.keys(sourceGroupsByDataCount).sort();
    var targetDataCounts = _.keys(targetGroupsByDataCount).sort();
    //
    //var allRankedSourceData = getRankedDataFields(sourceVis.groups);
    //var allRankedTargetMappings = getRankedDataFields(targetVis.groups);

    var allNewMappings = [];

    for (var i = 0; i < sourceDataCounts.length; ++i) {
        if (i >= targetDataCounts.length) {
            continue;
        }
        var sourceGroups = sourceGroupsByDataCount[sourceDataCounts[i]];
        var targetGroups = targetGroupsByDataCount[targetDataCounts[i]];

        // Rank source data, target mappings.  Filter out axes and deconID mappings.
        var rankedSourceData = getRankedDataFields(sourceGroups);
        var rankedSourceDataNonDerived = _.filter(rankedSourceData, function(dataField) {
            return !isDerived(dataField.fieldName) && !isAxis(dataField.group.name);
        });
        var rankedTargetMappings = getRankedMappings(targetGroups);
        var rankedTargetMappingsNonDerived = _.filter(rankedTargetMappings, function(mapping) {
            var data = mapping.getData();
            return !isDerived(data) && !isAxis(mapping.group.name);
        });

        var newNonDerivedMappings = transferMappings(rankedSourceDataNonDerived, rankedTargetMappingsNonDerived, rankedTargetMappings);

        var rankedSourceDataDerived = _.filter(rankedSourceData, function(dataField) {
            return isDerived(dataField.fieldName) && !isAxis(dataField.group.name);
        });
        var rankedTargetMappingsDerived = _.filter(rankedTargetMappings, function(mapping) {
            var data = mapping.getData();
            return isDerived(data) && !isAxis(mapping.group.name);
        });

        var newDerivedMappings = transferMappings(rankedSourceDataDerived, rankedTargetMappingsDerived, rankedTargetMappings);

        allNewMappings = allNewMappings.concat(newNonDerivedMappings);
        allNewMappings = allNewMappings.concat(newDerivedMappings);
    }

    var axisGroups = _.filter(targetVis.groups, function(group) { return isAxis(group.name); });
    axisGroups = propagateDataToAxes(allNewMappings, axisGroups, rankedSourceData);

    var groups = groupMappings(allNewMappings);

    var axes = _.groupBy(axisGroups, function(group) {
        return group.name[0] + group.name[5];
    });

    var newAxisGroups = createAxes(axes, targetVis, allNewMappings);
    groups = groups.concat(newAxisGroups);

    var newDecon =  new Deconstruction(clone(targetVis.svg), groups);
    newDecon.svg = clone(newDecon.getMarkBoundingBox(targetVis.svg));
    return newDecon;
};

var createAxes = function(axes, targetVis, newMappings) {
    var axisMarkGroups = [];
    _.each(axes, function(axis) {
        axis = _.groupBy(axis, function(group) { return group.name.split("-")[1]; });
        var labels = clone(axis["labels"][0]);
        var ticks = clone(axis["ticks"][0]);
        var line = clone(axis["line"][0]);

        var mappingPositionAttr = ticks.name[0] + "Position";
        var positionMappings = ticks.getMappingsForAttr(mappingPositionAttr);
        var linearPositionMapping = _.filter(positionMappings, function(mapping) { return mapping.type === "linear" && !isDerived(mapping.data[0]); });
        if (linearPositionMapping.length > 0) {
            axisMarkGroups = axisMarkGroups.concat(createLinearAxis(linearPositionMapping, ticks, labels, line, targetVis, newMappings));
        }
        else {
            var derivedPositionMapping = positionMappings[0];
            axisMarkGroups = axisMarkGroups.concat(createDerivedAxis(derivedPositionMapping, ticks, labels, line));
        }
    });
    return axisMarkGroups;
};

var createDerivedAxis = function(positionMapping, ticks, labels, line) {
    var attrName = ticks.name[0] + "Position";
    var tickPositionMapping = _.findWhere(ticks.mappings, function(mapping) {return mapping.attr === attrName;});
    ticks.mappings = _.without(ticks.mappings, tickPositionMapping);

    var derivedReplacementField;
    if (_.contains(_.keys(ticks.replacedData), tickPositionMapping.data[0])) {
        derivedReplacementField = ticks.replacedData[tickPositionMapping.data[0]];
    }
    else {
        return [];
    }

    var derivedField = tickPositionMapping.data[0];

    tickPositionMapping.group = ticks;
    ticks.data[derivedField] = clone(derivedReplacementField.group.data[derivedReplacementField.fieldName]);
    var idField = findIdentifierField(derivedReplacementField.group.data);

    if (!idField) idField = clone(derivedReplacementField.group.data[derivedReplacementField.fieldName]);
    ticks.data['string'] = clone(idField);

    var newMapping = transferIntervalMapping(ticks.replacedData[derivedField], tickPositionMapping);
    ticks.mappings.push(newMapping);
    ticks.addMarksForData();
    ticks.updateAttrsFromMappings();

    var labelPositionMapping = _.findWhere(labels.mappings, function(mapping) {return mapping.attr === attrName;});
    labels.mappings = _.without(labels.mappings, labelPositionMapping);
    labels.data[derivedField] = clone(derivedReplacementField.group.data[derivedReplacementField.fieldName]);
    labels.data['string'] = clone(idField);
    labels.mappings.push(clone(newMapping));
    labels.addMarksForData();
    var removed = 0;
    for (var j = 0; j < labels.mappings.length - removed; ++j) {
        var mapping = labels.mappings[j];
        var spatial = ["xPosition", "yPosition", "width", "height"];
        if (_.contains(spatial, mapping.attr) && mapping.type !== "linear") {
            labels.mappings.splice(j, 1);
            removed++;
        }
    }

    labels.updateAttrsFromMappings();
    labels.updateUnmapped();

     labels.nodeAttrs.forEach(function(nodeAttr, i) {
        nodeAttr.text = labels.data['string'][i];
    });

    var length = newMapping.params.interval * (ticks.data[derivedField].length - 1);
    length += newMapping.params.interval / 4;
    var oldMinVal = _.min(line.attrs[attrName]);
    var oldMaxVal = _.max(line.data['axis']);
    var newMaxVal = oldMinVal + length;
    for (var i = 0; i < line.attrs[attrName].length; ++i) {
        if (line.data['axis'][i] === oldMaxVal) {
            line.data['axis'][i] = newMaxVal;
        }
    }
    line.updateAttrsFromMappings();


    return [ticks, labels, line];
};

var findIdentifierField = function(data) {
    var fields = _.keys(data);
    var idField;
    fields.forEach(function(field) {
        if (typeof data[field][0] === 'string' && _.uniq(data[field]).length === data[field].length) {
            idField = data[field];
        }
    });
    return idField;
};

var createLinearAxis = function(positionMapping, axisTicks, axisLabels, axisLine, targetVis, newMappings) {
    positionMapping = positionMapping[0];
    var mappingPositionAttr = axisTicks.name[0] + "Position";
    var axis = axisTicks.name[0];

    var positionMappingSets = targetVis.mappingSets[mappingPositionAttr];
    var targetMappingSet = findSetForMapping(positionMapping, positionMappingSets);
    var nonAxisMappings = _.filter(targetMappingSet.mappings, function (mappingSetMapping) {
        return !mappingSetMapping.group.name;
    });
    var newMappingAnalog = _.filter(newMappings, function (newMapping) {
        return newMapping.targetAnalog.isEqualTo(nonAxisMappings[0])
    });

    var targetMapping = nonAxisMappings[0];
    newMappingAnalog = newMappingAnalog[0];

    if (!newMappingAnalog) return [];

    var rel = findRelationship(targetMapping, positionMapping);
    var newAxisPositionCoeffs = propagateCoeffs(newMappingAnalog, rel);
    var newAxisPositionMapping = clone(positionMapping);
    newAxisPositionMapping.params.coeffs = newAxisPositionCoeffs;


    axisLine.getMappingForAttr(axis + "Position").params.coeffs = clone(newAxisPositionCoeffs);
    for (var i = 0; i < axisLine.attrs[axis + 'Position'].length; ++i) {
        axisLine.data['domain'][i] = newAxisPositionMapping.invert(axisLine.attrs[axis + 'Position'][i]);
    }
     axisLine.updateAttrsFromMappings();

    axisTicks.getMappingForAttr(axis + "Position").params.coeffs = clone(newAxisPositionCoeffs);
    for (i = 0; i < axisTicks.attrs[axis + 'Position'].length; ++i) {
        axisTicks.data['number'][i] = newAxisPositionMapping.invert(axisTicks.attrs[axis + 'Position'][i]);
    }
    axisTicks.updateAttrsFromMappings();

    axisLabels.getMappingForAttr(axis + "Position").params.coeffs = clone(newAxisPositionCoeffs);
    for (i = 0; i < axisLabels.attrs[axis + 'Position'].length; ++i) {
        axisLabels.data['number'][i] = newAxisPositionMapping.invert(axisLabels.attrs[axis + 'Position'][i]);
    }

    for (i = 0; i < axisLabels.attrs[axis + 'Position'].length; ++i) {
        if (_.max(axisLabels.data['number']) < 5)
            axisLabels.nodeAttrs[i].text = (Math.round(axisLabels.data['number'][i] * 100) / 100).toString();
        else {
            axisLabels.nodeAttrs[i].text = Math.round(axisLabels.data['number'][i]).toString();
        }
    }

    axisLabels.updateAttrsFromMappings();


    return [axisLine, axisTicks, axisLabels];
};

var findSetForMapping = function(mapping, mappingSets) {
    var foundSet;
    _.each(mappingSets, function(mappingSet) {
        //_.each(mappingSet.mappings, function(mappingRef) {
        //    if (mappingRef.data === mapping.data && rangeContains(mapping.attrRange, mappingRef.range)) {
        //        foundSet = mappingSet;
        //    }
        //});
        if (_.filter(mappingSet.mappings, function(setMapping) {return setMapping.isEqualTo(mapping); }).length > 0) {
            foundSet = mappingSet;
        }
    });
    return foundSet;
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

var propagateMappings = function (newMapping, transferredMapping, allMappings, skipList, sourceDataField) {
    var propagatedMappings = [];

    var remainingMappings = _.filter(allMappings, function(item) {
        return !_.contains(skipList, item);
    });

    // find other target mappings with the same data field
    var sameDataMappings = _.filter(remainingMappings, function(mapping) {
        var mappingData = mapping.getData();
        var transferredMappingData = transferredMapping.getData();
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
        if (sameDataMapping.type === "linear") {
            var rel = findRelationship(transferredMapping, sameDataMapping);
            var propagatedMappingCoeffs = propagateCoeffs(newMapping, rel);
            var newPropagatedMapping = new Mapping(newMapping.data, sameDataMapping.attr, "linear", {coeffs: propagatedMappingCoeffs});
            newPropagatedMapping.targetGroup = sameDataMapping.group;
            newPropagatedMapping.sourceGroup = sourceDataField.group;
            newPropagatedMapping.targetAnalog = sameDataMapping;
            propagatedMappings.push(newPropagatedMapping);
            skipList.push(transferredMapping);
        }
        else if (sameDataMapping.type === "nominal") {
            var newPropagatedMapping = transferMapping(sourceDataField, sameDataMapping);
            newPropagatedMapping.targetGroup = sameDataMapping.group;
            newPropagatedMapping.sourceGroup = sourceDataField.group;
            newPropagatedMapping.targetAnalog = sameDataMapping;
            propagatedMappings.push(newPropagatedMapping);
            skipList.push(transferredMapping);
        }
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

var transferMapping = function (sourceField, targetMapping) {
    if (isDerived(targetMapping.data[0]) && isDerived(sourceField.fieldName)) {
        return transferIntervalMapping(sourceField, targetMapping);
    }
    else if (targetMapping.type == "linear") {
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


var transferIntervalMapping = function (sourceField, targetMapping) {
    var sourceAttrVals = sourceField.group.attrs[targetMapping.attr];
    var targetAttrVals = targetMapping.group.attrs[targetMapping.attr];

    var sourceInterval = getArrayInterval(sourceAttrVals);
    var targetInterval = getArrayInterval(targetAttrVals);

    var sourceData = sourceField.group.data[sourceField.fieldName];
    var sourceDataInterval = getArrayInterval(sourceData);

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
        var mapping = new Mapping([sourceField.fieldName], targetMapping.attr, 'linear', params);
        if (sourceField.dataRange) {
            mapping.dataRange = clone(sourceField.dataRange);
        }
        else {
            mapping.dataRange = clone(sourceData);
        }

        mapping.targetGroup = targetMapping.group;
        mapping.sourceGroup = sourceField.group;
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


var loadDeconstructedVis = function (filename) {
    var file = fs.readFileSync(filename, 'utf8');
    var decon = JSON.parse(file);
    return Deconstruction.fromJSON(decon);
};


var main = function () {
    _.each(transferTests, function (test) {
        test.sourceDecon = loadDeconstructedVis(test.source_file);
        test.targetDecon = loadDeconstructedVis(test.target_file);

        test.result = transferChart(test.sourceDecon, test.targetDecon);
    });
    fs.writeFile('view/data/next.json', CircularJSON.stringify(transferTests));
};

if (require.main === module) {
    main();
}

module.exports = {
    loadDeconstructedVis: loadDeconstructedVis
};