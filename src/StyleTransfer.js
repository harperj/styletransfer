var libDecon = require('d3-decon-lib');
var Deconstruction = libDecon.Deconstruction;
var Mapping = libDecon.Mapping;
var fs = require('fs');

var _ = require('lodash');
var assert = require('assert');
var clone = require('clone');
var ss = require('simple-statistics');
var d3 = require('d3');
var CircularJSON = require('circular-json');

var util = require('./util');
var config = require('./config');
var transferTests = require('./tests');

var EPSILON = Math.pow(2, -8);

var getNonAxisGroups = function (decon) {
    return _.filter(decon.groups, function (group) {
        return !group.axis;
    });
};

var getRankedDataFields = function (groups) {
    //var groups = getNonAxisGroups(sourceDecon);
    var sourceMappings = _.map(groups, function (group) {
        return _.map(group.mappings, function (mapping) {
            mapping.group = group;
            return mapping;
        });
    });

    var mappingsByDataField = _.groupBy(_.flatten(sourceMappings), function (mapping) {
        return mapping.getData();
    });
    var dataFieldsRanked = _.map(mappingsByDataField, function (mappings, fieldName) {
        var maxRankMapping = _.min(mappings, function (mapping) {
            return util.getSemiologyRanking(mapping.type, mapping.attr);
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
            rank: util.getSemiologyRanking(maxRankMapping.type, maxRankMapping.attr),
            mappingType: maxRankMapping.type,
            dataRange: dataRange,
            data: maxRankMapping.group.data,
            sourceData: maxRankMapping.group.data,
            //group: maxRankMapping.group
            group: undefined
        };
    });
    dataFieldsRanked = _.sortBy(dataFieldsRanked, function (dataField) {
        return dataField.rank;
    });
    return dataFieldsRanked;
};

var getRankedMappings = function (groups) {
    var targetMappings = _.map(groups, function (group) {
        return _.map(group.mappings, function (mapping) {
            mapping.group = group;
            return mapping;
        });
    });

    targetMappings = _.flatten(targetMappings);

    var rankedMappings = _.map(targetMappings, function (mapping) {
        mapping.rank = util.getSemiologyRanking(mapping.type, mapping.attr);
        return mapping;
    });
    return _.sortBy(rankedMappings, function (mapping) {
        return mapping.rank;
    });
};

var getBestMatchingMapping = function (sourceField, targetMappings) {
    var sameTypeMappings = _.filter(targetMappings, function (targetMapping) {
        return targetMapping.type === sourceField.mappingType;
    });

    if (sameTypeMappings.length >= 1) {
        return sameTypeMappings[0];
    }
    else if (sourceField.mappingType === "linear") {
        return targetMappings[0];
    }
    else {
        return null;
    }
};

var transferMappings = function (rankedSourceData, rankedTargetMappings) {
    var transferredMappings = [];

    var newMappings = [];

    rankedSourceData = _.sortBy(rankedSourceData, 'rank');

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

var propagateDataToAxes = function (newMappings, axisGroups, sourceDataFields) {
    newMappings.forEach(function (mapping) {
        var targetDataReplaced = mapping.targetAnalog.getData();
        var newDataField = mapping.getData();
        newDataField = _.filter(sourceDataFields, function (dataField) {
            return dataField.fieldName === newDataField;
        })[0];

        axisGroups.forEach(function (group) {
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

var groupMappings = function (newMappings) {
    var groupedNewMappings = groupMappingsByTargetGroup(newMappings);
    var groups = [];
    _.each(groupedNewMappings, function (mappingGroup) {
        var newMarkGroup = clone(mappingGroup.mappings[0].targetGroup);
        for (var i = 0; i < mappingGroup.mappings.length; ++i) {
            mappingGroup.mappings[i].newGroup = newMarkGroup;
        }
        newMarkGroup.mappings = clone(mappingGroup.mappings);

        if (newMarkGroup.mappings[0].sourceData) newMarkGroup.data = clone(newMarkGroup.mappings[0].sourceData);
        else newMarkGroup.data = clone(newMarkGroup.mappings[0].sourceGroup.data);

        var dataLength = newMarkGroup.data[_.keys(newMarkGroup.data)[0]].length;
        var attrNames = _.keys(newMarkGroup.attrs);
        _.each(attrNames, function (attrName) {
            var firstVal = newMarkGroup.attrs[attrName][0];
            newMarkGroup.attrs[attrName] = fillArray(firstVal, dataLength);
        });
        newMarkGroup.ids = [];
        for (var j = 0; j < dataLength; ++j) {
            newMarkGroup.ids.push(j + 1);
        }

        //transferUnmapped(mappingGroup.targetGroup, newMarkGroup);
        groups.push(newMarkGroup);
    });
    return groups;
};

function fillArray(value, len) {
    var arr = [];
    for (var i = 0; i < len; i++) {
        arr.push(value);
    }
    return arr;
}

var isDerivedField = function (fieldName) {
    var deconReg = /_deriv_*/;
    return fieldName.match(deconReg);
};
var isAxisGroup = function (groupName) {
    var axisReg = /.axis*/;
    if (groupName) {
        return groupName.match(axisReg);
    }
    else {
        return false;
    }
};

var extractDataFromDeconstruction = function (sourceVis) {
    var nonAxisGroups = getNonAxisGroups(sourceVis);
    var groupsByDataCount = _.groupBy(nonAxisGroups, function (group) {
        return group.data[_.keys(group.data)[0]].length;
    });
    var sourceDataCounts = _.keys(groupsByDataCount).sort();
    var rankedDataByCount = {};
    for (var i = 0; i < sourceDataCounts.length; ++i) {
        rankedDataByCount[sourceDataCounts[i]] = getRankedDataFields(groupsByDataCount[sourceDataCounts[i]])
    }
    return rankedDataByCount;
};

var transferChart = function (sourceData, targetVis) {
    var targetNonAxisGroups = getNonAxisGroups(targetVis);

    var targetGroupsByDataCount = _.groupBy(targetNonAxisGroups, function (group) {
        return group.data[_.keys(group.data)[0]].length;
    });
    var sourceDataCounts = _.keys(sourceData).sort();
    var targetDataCounts = _.keys(targetGroupsByDataCount).sort();
    //
    //var allRankedSourceData = getRankedDataFields(sourceVis.groups);
    //var allRankedTargetMappings = getRankedDataFields(targetVis.groups);

    var allNewMappings = [];

    for (var i = 0; i < sourceDataCounts.length; ++i) {
        if (i >= targetDataCounts.length) {
            continue;
        }
        var sourceGroups = sourceData[sourceDataCounts[i]];
        var targetGroups = targetGroupsByDataCount[targetDataCounts[i]];

        // Rank source data, target mappings.  Filter out axes and deconID mappings.
        //var rankedSourceData = getRankedDataFields(sourceGroups);
        var rankedSourceData = sourceGroups;

        var rankedSourceDataNonDerived = _.filter(rankedSourceData, function (dataField) {
            if (typeof dataField.group !== 'undefined') {
                return !isDerivedField(dataField.fieldName) && !isAxisGroup(dataField.group.name);
            }
            else {
                return !isDerivedField(dataField.fieldName);
            }
        });
        var rankedTargetMappings = getRankedMappings(targetGroups);
        var rankedTargetMappingsNonDerived = _.filter(rankedTargetMappings, function (mapping) {
            var data = mapping.getData();
            return !isDerivedField(data) && !isAxisGroup(mapping.group.name);
        });

        var newNonDerivedMappings = transferMappings(rankedSourceDataNonDerived, rankedTargetMappingsNonDerived, rankedTargetMappings);

        var rankedSourceDataDerived = _.filter(rankedSourceData, function (dataField) {
            return isDerivedField(dataField.fieldName);
        });
        var rankedTargetMappingsDerived = _.filter(rankedTargetMappings, function (mapping) {
            var data = mapping.getData();
            return isDerivedField(data) && !isAxisGroup(mapping.group.name);
        });

        var newDerivedMappings = transferMappings(rankedSourceDataDerived, rankedTargetMappingsDerived, rankedTargetMappings);

        var constructedDerived = constructDerivedMappings(rankedTargetMappingsDerived, newDerivedMappings, sourceGroups);

        allNewMappings = allNewMappings.concat(newNonDerivedMappings);
        allNewMappings = allNewMappings.concat(newDerivedMappings);
        allNewMappings = allNewMappings.concat(constructedDerived);
        //console.log(allNewMappings);
    }

    var axisGroups = _.filter(targetVis.groups, function (group) {
        return isAxisGroup(group.name);
    });
    axisGroups = propagateDataToAxes(allNewMappings, axisGroups, rankedSourceData);

    var groups = groupMappings(allNewMappings);

    var axes = _.groupBy(axisGroups, function (group) {
        return group.name[0] + group.name[5];
    });

    var newAxisGroups = createAxes(axes, targetVis, allNewMappings, groups);
    groups = groups.concat(newAxisGroups);

    var newDecon = new Deconstruction(clone(targetVis.svg), groups);
    newDecon.svg = clone(newDecon.getMarkBoundingBox(targetVis.svg));
    return newDecon;
};

var constructDerivedMappings = function constructDerivedMappings(targetDerived, newDerived, sourceGroups) {
    var newDerivedMappings = [];
    _.each(targetDerived, function (derivedMapping) {
        var alreadyTransferred = false;
        _.each(newDerived, function (newDerivedMapping) {
            if (newDerivedMapping.targetAnalog === derivedMapping) {
                alreadyTransferred = true;
            }
        });

        if (!alreadyTransferred) {
            var derivedRegex = new RegExp("_deriv_" + derivedMapping.attr + "*");
            var sourceData = sourceGroups[0].group ? sourceGroups[0].group : sourceGroups[0].sourceData;
            var sourceGroupFields = _.keys(sourceData);
            var matching = _.filter(sourceGroupFields, function (field) {
                return field.match(derivedRegex) && field.match(derivedRegex).length > 0;
            });

            var fieldName;
            if (newDerived.length > 0) {
                fieldName = newDerived[0].getData();
            }
            else if (matching.length > 0) {
                fieldName = matching[0]
            }
            else {
                fieldName = derivedMapping.getData();
                sourceData[fieldName] = [];
                for (var i = 0; i < sourceData[_.keys(sourceData)[0]].length; ++i) {
                    sourceData[fieldName].push(i);
                }
            }

            if (fieldName) {
                var field = {
                    fieldName: fieldName,
                    dataRange: _.uniq(sourceData[fieldName]),
                    type: 'derived',
                    data: sourceData
                };
                var newMapping = transferMapping(field, derivedMapping);
                newMapping.sourceData = sourceData;
                sourceGroups.push(field);
            }
            if (newMapping) {
                newMapping.targetAnalog = derivedMapping;
                newDerived.push(newMapping);
            }
        }
    });
    return newDerived;
};

var getBoundingBoxFromGroups = function getBoundingBoxFromGroups(groups) {
    var decon = new Deconstruction({x: 0, y: 0, width: 0, height: 0}, groups);
    decon.svg = decon.getMarkBoundingBox({x: 0, y: 0, width: 0, height: 0});
    return decon.svg;
};

var createAxes = function (axes, targetVis, newMappings, newGroups) {
    var axisMarkGroups = [];
    _.each(axes, function (axis) {
        axis = _.groupBy(axis, function (group) {
            return group.name.split("-")[1];
        });
        var labels = clone(axis["labels"][0]);
        var ticks = clone(axis["ticks"][0]);
        var line = clone(axis["line"][0]);

        var mappingPositionAttr = ticks.name[0] + "Position";
        var positionMappings = ticks.getMappingsForAttr(mappingPositionAttr);
        var linearPositionMapping = _.filter(positionMappings, function (mapping) {
            return mapping.type === "linear" && !isDerivedField(mapping.data[0]);
        });

        if (linearPositionMapping.length > 0) {
            axisMarkGroups.push(createLinearAxis(linearPositionMapping, ticks, labels, line, targetVis, newMappings));
        }
        else {
            var derivedPositionMapping = positionMappings[0];
            var newAxis = createDerivedAxis(derivedPositionMapping, ticks, labels, line, newMappings);
            if (typeof newAxis !== "undefined" && newAxis.length === 3) {
                axisMarkGroups.push(newAxis);
            }
        }
    });

    for (var i = 0; i < axisMarkGroups.length; ++i) {
        var axis = axisMarkGroups[i];
        if (axis.length === 0) continue;
        var ticks = axis[0];
        var labels = axis[1];
        var line = axis[2];
        var newGroupBBox = getBoundingBoxFromGroups(newGroups);
        var targetNonAxisGroups = _.filter(targetVis.groups, function(group) { return !group.name; });
        var targetNonAxisBBox = getBoundingBoxFromGroups(targetNonAxisGroups);

        var newDecon = new Deconstruction({width: 0, height:0, x:0, y:0}, newGroups);
        var newVisBoundingBox = newDecon.getMarkBoundingBox();

        if (ticks.name[0] === 'x' && labels.attrs.yPosition[0] > ticks.attrs.yPosition[0]) {
            // bottom oriented axis
            var axisLineBBox = line.getMarkBoundingBox();
            var axisLineMin = axisLineBBox.y;
            var padding = axisLineMin - (targetNonAxisBBox.y + targetNonAxisBBox.height);
            var newGroupMax = newGroupBBox.y + newGroupBBox.height;
            var newAxisShiftDistance = newGroupMax - axisLineMin; // + padding;

            var MIN_DELTA = 5; // don't change unless we've shifted by at least 5 px
            if (newGroupMax > axisLineMin + MIN_DELTA) {
                ticks.attrs['yPosition'] = _.map(ticks.attrs['yPosition'], function(yPos) {return yPos + newAxisShiftDistance;});
                labels.attrs['yPosition'] = _.map(labels.attrs['yPosition'], function(yPos) {return yPos + newAxisShiftDistance;});
                line.attrs['yPosition'] = _.map(line.attrs['yPosition'], function(yPos) {return yPos + newAxisShiftDistance;});
                //line.getMapping('tick', 'yPosition').params.coeffs[1] += (newGroupMax - axisLineMin) + padding;
            }
        }
        if (ticks.name[0] === 'y' && labels.attrs.xPosition[0] < ticks.attrs.xPosition[0]) {
            // right-oriented axis
            if (ticks.attrs.width[0] > 100) {
                ticks.attrs['xPosition'] = _.map(ticks.attrs['xPosition'], function(xPos, i) {return 0.5 * newGroupBBox.width + (xPos - ticks.attrs['width'][0]/2);});
                ticks.attrs['width'] = _.map(ticks.attrs['width'], function(width) { return newGroupBBox.width; });
            }
        }
    }

    return _.flatten(axisMarkGroups);
};

var createDerivedAxis = function (positionMapping, ticks, labels, line, newMappings) {
    var oldNumTicks = ticks.ids.length;
    var attrName = ticks.name[0] + "Position";
    var tickPositionMapping = _.findWhere(ticks.mappings, function (mapping) {
        return mapping.attr === attrName;
    });
    ticks.mappings = _.without(ticks.mappings, tickPositionMapping);

    var derivedReplacementField;
    if (_.contains(_.keys(ticks.replacedData), tickPositionMapping.data[0])) {
        derivedReplacementField = ticks.replacedData[tickPositionMapping.data[0]];
        if (!derivedReplacementField) return [];
    }
    else {
        var newDerivedMapping = _.filter(newMappings, function (mapping) {
            return isDerivedField(mapping.getData())
        })[0];
        if (!newDerivedMapping) return;
        derivedReplacementField = {
            fieldName: newDerivedMapping.getData(),
            type: "derived",
            data: newDerivedMapping.newGroup.data,
            sourceData: newDerivedMapping.newGroup.data
        };
        tickPositionMapping.data[0] = newDerivedMapping.getData();
    }
    tickPositionMapping.group = ticks;

    var derivedField = tickPositionMapping.data[0];
    if (derivedField) {
        ticks.data[derivedField] = clone(derivedReplacementField.data[derivedReplacementField.fieldName]);
    }
    else {
        derivedField = derivedReplacementField.fieldName;
        ticks.data[derivedField] = clone(derivedReplacementField.data[derivedReplacementField.fieldName]);
    }
    var idFieldInfo = findIdentifierField(derivedReplacementField.data);
    var idField = idFieldInfo.fieldData;
    var idFieldName = idFieldInfo.fieldName;

    if (!idField) idField = clone(derivedReplacementField.data[derivedReplacementField.fieldName]);
    ticks.data['string'] = clone(idField);

    var newPositionMapping = transferIntervalMapping(derivedReplacementField, tickPositionMapping);
    newPositionMapping.data[0] = derivedField;
    ticks.mappings.push(newPositionMapping);
    ticks.addMarksForData();
    ticks.updateAttrsFromMappings();

    var labelPositionMapping = _.findWhere(labels.mappings, function (mapping) {
        return mapping.attr === attrName;
    });
    labels.mappings = _.without(labels.mappings, labelPositionMapping);
    labels.data[derivedField] = clone(derivedReplacementField.data[derivedReplacementField.fieldName]);
    labels.data['string'] = clone(idField);
    labels.attrs['text'] = clone(idField);
    var textMappingParams = {};
    idField.forEach(function(id) {
       textMappingParams[id] = id;
    });
    var newTextMapping = new Mapping(
        'string',
        'text',
        'nominal',
        textMappingParams,
        _.unique(labels.data['string']),
        _.unique(labels.data['string'])
    );

    labels.mappings.push(newTextMapping);
    labels.mappings.push(clone(newPositionMapping));
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

    labels.nodeAttrs.forEach(function (nodeAttr, i) {
        nodeAttr.text = labels.data['string'][i];
    });

    //var length = newMapping.params.interval * (ticks.data[derivedField].length);
    //length += newMapping.params.interval / 8;
    var oldMinVal = _.min(line.attrs[attrName]);
    var oldMaxVal = _.max(line.data['axis']);
    var oldLength = oldMaxVal - oldMinVal;
    var newLength = oldLength - (oldNumTicks * newPositionMapping.params.interval) + (ticks.data[derivedField].length * newPositionMapping.params.interval);
    var newMaxVal = oldMinVal + newLength;

    for (var i = 0; i < line.attrs[attrName].length; ++i) {
        if (line.data['axis'][i] === oldMaxVal) {
            line.data['axis'][i] = newMaxVal;
        }
    }
    line.updateAttrsFromMappings();

    return [ticks, labels, line];
};

var findIdentifierField = function (data) {
    var fields = _.keys(data);
    var idField;
    var idFieldName;
    fields.forEach(function (field, fieldName) {
        if (typeof data[field][0] === 'string' && _.uniq(data[field]).length === data[field].length) {
            idField = data[field];
            idFieldName = field;
        }
    });
    return {
        fieldName: idFieldName,
        fieldData: idField
    };
};

var createLinearAxis = function (positionMapping, axisTicks, axisLabels, axisLine, targetVis, newMappings) {
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

    var rel = targetMapping.linearRelationshipTo(positionMapping);
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
        axisTicks.data['number'][i] = newAxisPositionMapping.invert(Math.round(axisTicks.attrs[axis + 'Position'][i]));
    }
    axisTicks.updateAttrsFromMappings();

    axisLabels.getMappingForAttr(axis + "Position").params.coeffs = clone(newAxisPositionCoeffs);

    for (i = 0; i < axisLabels.attrs[axis + 'Position'].length; ++i) {
        axisLabels.data['number'][i] = newAxisPositionMapping.invert(Math.round(axisLabels.attrs[axis + 'Position'][i]));
    }

    var removed = 0;
    for (var j = 0; j < axisLabels.mappings.length - removed; ++j) {
        var mapping = axisLabels.mappings[j];
        var spatial = ["xPosition", "yPosition", "width", "height"];
        if (_.contains(spatial, mapping.attr) && mapping.type !== "linear") {
            axisLabels.mappings.splice(j, 1);
            removed++;
        }
    }
    removed = 0;
    for (var j = 0; j < axisTicks.mappings.length - removed; ++j) {
        mapping = axisTicks.mappings[j];
        spatial = ["xPosition", "yPosition", "width", "height"];
        if (_.contains(spatial, mapping.attr) && mapping.type !== "linear") {
            axisTicks.mappings.splice(j, 1);
            removed++;
        }
    }

    for (i = 0; i < axisLabels.attrs[axis + 'Position'].length; ++i) {
        if (_.max(axisLabels.data['number']) < 10) {
            axisLabels.attrs['text'][i] = (Math.round(axisLabels.data['number'][i] * 100) / 100).toString();
            axisLabels.nodeAttrs[i].text = (Math.round(axisLabels.data['number'][i] * 100) / 100).toString();
        }
        else {
            axisLabels.attrs['text'][i] = Math.round(axisLabels.data['number'][i]).toString();
            axisLabels.nodeAttrs[i].text = Math.round(axisLabels.data['number'][i]).toString();
        }
    }

    var textMapping = axisLabels.getMappingForAttr('text');
    textMapping.dataRange = clone(axisLabels.data['number']);
    textMapping.attrRange = clone(axisLabels.attrs['text']);
    textMapping.params = {};
    textMapping.type = 'nominal';
    textMapping.dataRange.forEach(function(dataVal, i) {
        textMapping.params[dataVal] = textMapping.attrRange[i];
    });

    axisLabels.updateAttrsFromMappings();


    return [axisTicks, axisLabels, axisLine];
};

var findSetForMapping = function (mapping, mappingSets) {
    var foundSet;
    _.each(mappingSets, function (mappingSet) {
        if (_.filter(mappingSet.mappings, function (setMapping) {
                return setMapping.isEqualTo(mapping);
            }).length > 0) {
            foundSet = mappingSet;
        }
    });
    return foundSet;
};

var groupMappingsByTargetGroup = function (mappings) {
    var mappingGroups = [];

    mappings.forEach(function (mapping) {
        var foundGroup = false;
        mappingGroups.forEach(function (mappingGroup) {
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
    var newPropagatedMapping;

    var remainingMappings = _.filter(allMappings, function (item) {
        return !_.contains(skipList, item);
    });

    // find other target mappings with the same data field
    var sameDataMappings = _.filter(remainingMappings, function (mapping) {
        var mappingData = mapping.getData();
        var transferredMappingData = transferredMapping.getData();
        return mappingData === transferredMappingData;
    });

    sameDataMappings.forEach(function (sameDataMapping) {
        if (sameDataMapping.type === "linear") {
            var rel = transferredMapping.linearRelationshipTo(sameDataMapping);
            var propagatedMappingCoeffs = propagateCoeffs(newMapping, rel);
            newPropagatedMapping = new Mapping(newMapping.data, sameDataMapping.attr, "linear", {coeffs: propagatedMappingCoeffs});
            newPropagatedMapping.targetGroup = sameDataMapping.group;
            newPropagatedMapping.sourceGroup = sourceDataField.group;
            newPropagatedMapping.sourceData = sourceDataField.group ? sourceDataField.group.data : sourceDataField.sourceData;
            newPropagatedMapping.targetAnalog = sameDataMapping;
            propagatedMappings.push(newPropagatedMapping);
            skipList.push(sameDataMapping);
        }
        else if (sameDataMapping.type === "nominal") {
            newPropagatedMapping = transferMapping(sourceDataField, sameDataMapping);
            if (newPropagatedMapping) {
                newPropagatedMapping.targetGroup = sameDataMapping.group;
                newPropagatedMapping.sourceGroup = sourceDataField.group;
                newPropagatedMapping.targetAnalog = sameDataMapping;
                propagatedMappings.push(newPropagatedMapping);
            }
            skipList.push(sameDataMapping);
        }
        else if (sameDataMapping.type === "derived") {
            newPropagatedMapping = new Mapping(newMapping.data, sameDataMapping.attr, "derived", {coeffs: sameDataMapping.params.coeffs});
            newPropagatedMapping.targetGroup = sameDataMapping.group;
            newPropagatedMapping.sourceGroup = sourceDataField.group;
            newPropagatedMapping.targetAnalog = sameDataMapping;
            propagatedMappings.push(newPropagatedMapping);
            skipList.push(sameDataMapping);
        }
    });

    return propagatedMappings;
};

var getHighestRankedMatch = function (dataField, mappings, skipList) {
    if (!skipList) {
        skipList = [];
    }

    var remainingList = _.filter(mappings, function (item) {
        return !_.contains(skipList, item);
    });

    var ranks = _.uniq(_.map(remainingList, function (mapping) {
        return mapping.rank;
    })).sort();

    for (var i = 0; i < ranks.length; ++i) {
        var thisRankMappings = _.filter(remainingList, function (item) {
            return item.rank === ranks[i];
        });
        var mapping = getBestMatchingMapping(dataField, thisRankMappings);
        if (mapping) {
            return mapping;
        }
    }

    return undefined;
};

var transferMapping = function (sourceField, targetMapping) {
    var newMapping;
    if (isDerivedField(targetMapping.getData()) && isDerivedField(sourceField.fieldName)) {
        newMapping = transferIntervalMapping(sourceField, targetMapping);
    }
    else if (targetMapping.type == "linear") {
        newMapping = transferMappingLinear(sourceField, targetMapping);
    }
    else if (targetMapping.type == "nominal") {
        newMapping = transferMappingNominal(sourceField, targetMapping);
    }
    newMapping.sourceData = sourceField.sourceData;
    return newMapping;
};

var transferMappingNominal = function (sourceField, targetMapping) {
    var newMapping = new Mapping(sourceField.fieldName, targetMapping.attr, "nominal", {});
    var params = {};
    var sourceDataVals = sourceField.dataRange;
    if (sourceField.sourceData) {
        sourceDataVals = _.uniq(sourceField.sourceData[sourceField.fieldName]);
    }
    var targetDataVals = _.keys(targetMapping.params);

    if (targetMapping.attr !== "text") {
        for (var j = 0; j < sourceDataVals.length; ++j) {
            params[sourceDataVals[j]] = targetMapping.map(targetDataVals[j % targetDataVals.length]);
        }
    }
    else {
        for (var j = 0; j < sourceDataVals.length; ++j) {
            params[sourceDataVals[j]] = sourceDataVals[j].toString();
        }
    }

    newMapping.params = params;
    newMapping.dataRange = sourceDataVals;
    newMapping.attrRange = _.values(params);
    newMapping.targetGroup = targetMapping.group;
    newMapping.sourceGroup = sourceField.group;


    return newMapping;
};


var transferIntervalMapping = function (sourceField, targetMapping) {
    var targetInterval = targetMapping.params.coeffs[0];

    var sourceData = sourceField.group ? sourceField.group.data[sourceField.fieldName] : sourceField.data[sourceField.fieldName];
    var sourceDataInterval = getArrayInterval(sourceData);

    var coeffs = getLinearCoeffs([
        [_.min(sourceData), targetMapping.params.attrMin],
        [_.min(sourceData) + sourceDataInterval, targetMapping.params.attrMin + targetInterval]
    ]);

    var params = {
        attrMin: targetMapping.params.attrMin,
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

    mapping.attrRange = _.map(mapping.dataRange, function (dataItem, i) {
        return params.attrMin + i * params.interval;
    });
    return mapping;
};

var getArrayInterval = function (arr) {
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
    if (_.contains(mappedAttrs, "area") && !_.contains(mappedAttrs, "width") && !_.contains(mappedAttrs, "height")) {
        mappedAttrs.push("width");
        mappedAttrs.push("height");
    }

    _.each(sourceVis.attrs, function (valArray, attr) {
        if (!_.contains(mappedAttrs, attr) && transferredVis.attrs.hasOwnProperty(attr)) {
            for (var i = 0; i < transferredVis.attrs[attr].length; ++i) {
                if (typeof valArray[0] === 'number') {
                    transferredVis.attrs[attr][i] = _.chain(valArray).sum() / valArray.length;
                }
                else {
                    transferredVis.attrs[attr][i] = _.chain(valArray).countBy().pairs().max(_.last).head().value();
                }
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
        sourceField.dataRange = [sourceField.dataRange[1], sourceField.dataRange[0]];
    }
    if (targetMapping.dataRange[0] > targetMapping.dataRange[1]) {
        targetMapping.attrRange = [targetMapping.attrRange[1], targetMapping.attrRange[0]];
    }

    newMapping.params.coeffs = getLinearCoeffs([
        [sourceField.dataRange[0], targetMapping.attrRange[0]],
        [sourceField.dataRange[1], targetMapping.attrRange[1]]
    ]);
    newMapping = Mapping.fromJSON(newMapping);
    newMapping.dataRange = sourceField.dataRange;
    newMapping.attrRange = targetMapping.attrRange;
    newMapping.targetGroup = targetMapping.group;
    newMapping.sourceGroup = sourceField.group;

    return newMapping;
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

var main = function () {
    _.each(transferTests, function (test) {
        var sourceData;
        test.sourceDecon = {};

        if (typeof test.source_type === "undefined" || test.source_type === "deconstruction") {
            test.sourceDecon = util.loadDeconstructedVis(test.source_file);

            // FIXME: extractDataFromDeconstruction currently non-functional.
            sourceData = extractDataFromDeconstruction(test.sourceDecon);
        }
        else if (test.source_type === "json_data") {
            sourceData = util.loadJSONData(test.source_file);
        }
        else if (test.source_type === "vegalite") {
            sourceData = util.loadVegaLiteVis(test.source_file);
        }

        test.targetDecon = util.loadDeconstructedVis(test.target_file);

        test.result = transferChart(sourceData, test.targetDecon);
    });
    fs.writeFile('view/data/next.json', CircularJSON.stringify(transferTests));
};

if (require.main === module) {
    main();
}