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

var config = require('./config');
var transferTests = require('./tests-axisfix');

var loadDeconstructedVis = function (filename) {
    var file = fs.readFileSync(filename, 'utf8');
    var decon = JSON.parse(file);
    return Deconstruction.fromJSON(decon);
};

var getSemiologyRanking = function (mapping) {
    if (mapping.type === "linear") {
        return _.indexOf(config.semiology_lin, mapping.attr);
    }
    else {
        return _.indexOf(config.semiology_nom, mapping.attr);
    }
};

var getMinRanked = function (mappingArray, skipList, requireLinear) {
    if (!skipList) {
        skipList = [];
    }

    var min = Number.MAX_VALUE;
    var minMapping;
    _.each(mappingArray, function (mapping) {
        var rank = getSemiologyRanking(mapping);

        var skipNotLinear = requireLinear && mapping.type !== "linear";

        if (rank < min && !_.contains(skipList, mapping) && !skipNotLinear) {
            min = rank;
            minMapping = mapping;
        }
    });
    return minMapping;
};

var transferStyle = function (sourceVis, targetVis) {
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

        if (sourceNextMapping.type !== "nominal" && targetNextMapping.type !== "nominal") {
            var propagated = propagateMappings(newMapping, sourceNextMapping, targetNextMapping, sourceProcessedMappings, targetProcessedMappings, sourceVis, targetVis);
            newVis.mappings = newVis.mappings.concat(propagated);
        }
    }
    transferUnmapped(targetVis, newVis);

    return newVis;
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
    var sourceDataVals = _.keys(sourceMapping);
    var targetDataVals = _.keys(targetMapping);

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
    }
    else {
        var bbox = vis.getMarkBoundingBox();
        if (mapping.attr == "yPosition") {
            attrRange = [bbox.y - bbox.height / 2, bbox.y + bbox.height / 2];
            dataRange = [mapping.invert(attrRange[0]), mapping.invert(attrRange[1])];
        }
        else if (mapping.attr == "xPosition") {
            attrRange = [bbox.x - bbox.width / 2, bbox.x + bbox.width / 2];
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
        return new Mapping(sourceMapping.data, targetMapping.attr, 'linear', params)
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
        if (mapping.type == "linear") {
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
        if (mappingSet.mappings.length > 1) {
            mappingSet.mappings.forEach(function (mapping) {
                mapping.dataRange = mappingSet.domain;
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
                    mapping.attrRange = [mappingSet.largest.map(mappingSet.domain[0]*relationship[0]),
                        mappingSet.largest.map(mappingSet.domain[1]*relationship[0])];
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
    return rangeContains(rangeSet.domain, domain) && rangeContains(rangeSet.range, range);
};


var rangeContains = function(range1, range2) {
    var range1Min = _.min(range1);
    var range1Max = _.max(range1);
    var range2Min = _.min(range2);
    var range2Max = _.max(range2);

    return range1Min <= range2Min + 2 && range1Max >= range2Max - 2;
};

var main = function () {
    _.each(transferTests, function (test, testName) {
        //var sourceDecon = loadDeconstructedVis(test.source_file);
        //var targetDecon = loadDeconstructedVis(test.target_file);

        test.sourceDecon = JSON.parse(fs.readFileSync(test.source_file, 'utf8'));
        test.sourceDecon = Deconstruction.fromJSON(test.sourceDecon);
        test.targetDecon = JSON.parse(fs.readFileSync(test.target_file, 'utf8'));
        test.targetDecon = Deconstruction.fromJSON(test.targetDecon);

        test.result = {
            "svg": test.targetDecon.svg,
            "groups": []
        };

        test.sourceDecon = replaceMaxMappingRanges(test.sourceDecon);
        test.targetDecon = replaceMaxMappingRanges(test.targetDecon);

        _.each(test.transfers, function (transfer) {
            var result = transferStyle(
                test.sourceDecon.getGroupByName(transfer[0]),
                test.targetDecon.getGroupByName(transfer[1])
            );
            result.updateAttrsFromMappings();
            test.result.groups.push(result);
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