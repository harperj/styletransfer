var createVisContainer = function (container, decon) {
    //var svgWidth = decon.svg ? decon.svg.width : 1000;
    //var svgHeight = decon.svg ? decon.svg.height : 1000;
    var svgWidth = 1000;
    var svgHeight = 600;

    var svg = d3.select(container)
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .style("border", "1px solid black")
        //.attr("height", "500px")
        //.attr("height", svgHeight / 5)
        //.attr("width", svgWidth / 5)
        .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight)
        .attr("preserveAspectRatio", "xMidYMid")
        .node();
    renderVis(decon, svg);
};


var renderVis = function (decon, svgNode) {
    var groups = decon.groups;
    groups = _.sortBy(groups, function(group) {
        var val = 0;
        if (group.axis) val = -10;
        return val;
    });


    for (var j = 0; j < groups.length; ++j) {
        var vis = groups[j];
        if (vis.attrs.shape[0] === 'linePoint') {
            console.log("Found a line.  WARNING: Lines generated from source charts without lines will not work.");
            var lineInds = getDeconToIndMapping(vis);
            for (var lineDeconID in lineInds) {
                var inds = lineInds[lineDeconID];
                var lineData = getDataFromInds(vis, inds);
                var lineAttrs = getAttrsFromInds(vis, inds);
                var lineNodeAttrs = getNodeAttrsFromInds(vis, inds);

                drawLine(lineAttrs, lineData, lineNodeAttrs, svgNode);
            }
        }
        else {
            vis = equalizeTextElementSize(vis, svgNode);

            for (var i = 0; i < vis.ids.length; ++i) {
                var attrs = getAttrsFromInd(vis, i);
                var data = getDataFromInd(vis, i);
                var nodeAttrs = vis.nodeAttrs[i];


                drawNode(attrs, data, nodeAttrs, vis, svgNode);
            }
        }
    }
};

var equalizeTextElementSize = function(group, svgNode) {
    var textElementInds = [];
    for (var k = 0; k < group.ids.length; ++k) {
        if (group.attrs['shape'][k] === "text") {
            textElementInds.push(k);
        }
    }

    var widthScaleFactor = 1;
    var heightScaleFactor = 1;

    if (textElementInds.length > 0) {
        var textWidths = _.map(textElementInds, function(ind) {
            return group.attrs['width'][ind];
        });
        var textHeights = _.map(textElementInds, function(ind) {
            return group.attrs['height'][ind];
        });
        var maxTextWidth = _.max(textWidths);
        var maxTextHeight = _.max(textHeights);

        for (var i = 0; i < textElementInds.length; ++i) {
            var newNode = getNewNodeFromShape('text');
            var attrs = {};
            _.each(_.keys(group.attrs), function(attrName) {
                attrs[attrName] = group.attrs[attrName][textElementInds[i]];
            });

            svgNode.appendChild(newNode);
            transferNonSpatialAttrs(newNode, group.nodeAttrs[textElementInds[i]], attrs);
            var bbox = transformedBoundingBox(newNode);
            $(newNode).remove();
            if (bbox.width > maxTextWidth) {
                var elWidthScale =  maxTextWidth / bbox.width;
                if (elWidthScale < widthScaleFactor) {
                    widthScaleFactor = elWidthScale;
                }
            }
            if (bbox.height > maxTextHeight) {
                var elHeightScale = maxTextHeight / bbox.height;
                if (elHeightScale < heightScaleFactor) {
                    heightScaleFactor = elHeightScale;
                }
            }
        }
    }

    if (widthScaleFactor < heightScaleFactor) {
        heightScaleFactor = widthScaleFactor;
    }
    else {
        widthScaleFactor = heightScaleFactor;
    }

    group.textScale = {
        width: 1,
        height: 1
    };
    return group;
};

var getDeconToIndMapping = function (vis) {
    var mapping = {};

    _.each(vis.ids, function (id, ind) {
        if (!mapping.hasOwnProperty(id)) {
            mapping[id] = [ind];
        }
        else {
            mapping[id].push(ind);
        }
    });

    return mapping;
};

function getAttrsFromInd(schema, ind) {
    var attrs = {};
    _.each(schema.attrs, function (val, attr) {
        attrs[attr] = val[ind];
    });
    return attrs;
}

function getAttrsFromInds(schema, inds) {
    var attrs = {};
    _.each(inds, function (ind) {
        _.each(schema.attrs, function (val, attr) {
            if (!attrs.hasOwnProperty(attr)) {
                attrs[attr] = [val[ind]];
            }
            else {
                attrs[attr].push(val[ind]);
            }
        });
    });

    return attrs;
}

var getNodeAttrsFromInds = function (schema, inds) {
    var nodeAttrs = [];
    _.each(inds, function (ind) {
        nodeAttrs.push(schema.nodeAttrs[ind]);
    });
    return nodeAttrs;
};

function getDataFromInd(schema, ind) {
    var data = {};
    _.each(schema.data, function (val, attr) {
        data[attr] = val[ind];
    });
    return data;
}

function getDataFromInds(schema, inds) {
    var data = {};
    _.each(inds, function (ind) {
        _.each(schema.data, function (val, attr) {
            if (!data.hasOwnProperty(attr)) {
                data[attr] = [val[ind]];
            }
            else {
                data[attr].push(val[ind]);
            }
        });
    });

    return data;
}

var transferNonSpatialAttrs = function (newNode, nodeAttrs, attrs) {
    _.each(nodeAttrs, function (val, attr) {
        if (attr === "text") {
            $(newNode).text(val);
        }
        else {
            d3.select(newNode).attr(attr, val);
        }
    });

    _.each(attrs, function (val, attr) {
        if (attr === "text") {
            // Previously this conditional contained "&& !$(newNode).text()".  Why?
            $(newNode).text(val);
        }
        if (val !== null) {
            d3.select(newNode).style(attr, val);
        }
    });
    d3.select(newNode).style("vector-effect", "non-scaling-stroke");
};

var transferSpatialAttrs = function (newNode, svg, attrs, group) {
    var newNodeBoundingBox = transformedBoundingBox(newNode);
    var newScale = svg.createSVGTransform();
    var widthScale = attrs['width'] / newNodeBoundingBox.width;
    var heightScale = attrs['height'] / newNodeBoundingBox.height;

    if (attrs['shape'] === "text") {
        widthScale = group.textScale.width;
        heightScale = group.textScale.height;
    }

    if (isNaN(widthScale) || widthScale == Infinity) {
        widthScale = 1;
    }
    if (isNaN(heightScale) || heightScale == Infinity) {
        heightScale = 1;
    }
    if (isFinite(widthScale) && isFinite(heightScale)) newScale.setScale(widthScale, heightScale);

    newNode.transform.baseVal.appendItem(newScale);

    newNodeBoundingBox = transformedBoundingBox(newNode);

    var newTranslate = svg.createSVGTransform();
    var globalTransform = newNode.getTransformToElement(svg);
    var globalToLocal = globalTransform.inverse();


    var newNodeCurrentGlobalPt = svg.createSVGPoint();
    newNodeCurrentGlobalPt.x = newNodeBoundingBox.x + (newNodeBoundingBox.width / 2);
    newNodeCurrentGlobalPt.y = newNodeBoundingBox.y + (newNodeBoundingBox.height / 2);

    var newNodeDestinationGlobalPt = svg.createSVGPoint();
    newNodeDestinationGlobalPt.x = attrs['xPosition'];
    newNodeDestinationGlobalPt.y = attrs['yPosition'];

    var localCurrentPt = newNodeCurrentGlobalPt.matrixTransform(globalToLocal);
    var localDestinationPt = newNodeDestinationGlobalPt.matrixTransform(globalToLocal);

    var xTranslate = localDestinationPt.x - localCurrentPt.x;
    var yTranslate = localDestinationPt.y - localCurrentPt.y;
    newTranslate.setTranslate(xTranslate, yTranslate);

    newNode.transform.baseVal.appendItem(newTranslate);

    var newRotate = svg.createSVGTransform();
    newRotate.setRotate(+attrs['rotation'], 0, 0);
    newNode.transform.baseVal.appendItem(newRotate);
};

var drawLine = function (attrs, data, nodeAttrs, svg) {
    var newNode = createLine(data, attrs, svg);
    var firstPointAttrs = {};
    for (var attr in attrs) {
        firstPointAttrs[attr] = attrs[attr][0];
    }
    delete nodeAttrs[0]['d'];

    transferNonSpatialAttrs(newNode, nodeAttrs[0], firstPointAttrs);

    newNode.__data__ = data;
    newNode.__attrs__ = attrs;
};

var createLine = function (data, attrs, svg) {
    var indMapping = {};

    if (data['lineID']) {
        _.each(data['lineID'], function (lineID, ind) {
            indMapping[lineID] = ind;
        });
    }
    else {
        var positions = attrs['xPosition'].slice(attrs['xPosition']);
        positions.forEach(function(position, ind) {
            positions[ind] = [ind, position];
        });
        positions = positions.sort(function(a,b) {
            if(a[1] > b[1]) return -1;
            else if(a[1] === b[1]) return 0;
            else return 1;
        });
        _.each(positions, function (position, ind) {
            indMapping[ind] = position[0];
        });
    }
    //console.log(indMapping);

    var newNode = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.appendChild(newNode);

    var dString = "";

    for (var i = 0; i <= _.max(indMapping); ++i) {
        if (i === 0) {
            dString += "M" + attrs['xPosition'][indMapping[i]] + "," + attrs['yPosition'][indMapping[i]];
        }
        else {
            dString += "L" + attrs['xPosition'][indMapping[i]] + "," + attrs['yPosition'][indMapping[i]];
        }
    }
    d3.select(newNode).attr("d", dString);
    return newNode;
};

function drawNode(attrs, data, nodeAttrs, group, svg) {
    var newNode = getNewNodeFromShape(attrs['shape']);

    transferNonSpatialAttrs(newNode, nodeAttrs, attrs);

    svg.appendChild(newNode);

    transferSpatialAttrs(newNode, svg, attrs, group);

    newNode.__data__ = data;
    newNode.__attrs__ = attrs;
}

var shapeSpecs = {
    "triangle": "-20,-17 0,17 20,-17",
    "star": "10,0, 4.045084971874736,2.938926261462366, 3.090169943749474,9.510565162951535, -1.545084971874737,4.755282581475767, -8.090169943749473,5.877852522924733, -5,6.12323399409214e-16, -8.090169943749473,-5.87785252292473, -1.5450849718747377,-4.755282581475767, 3.0901699437494727,-9.510565162951535, 4.045084971874736,-2.9389262614623664",
    "plus": "-1,-8 1,-8 1,-1 8,-1 8,1 1,1 1,8 -1,8 -1,1 -8,1 -8,-1 -1,-1",
    "diamond": "1,0 0,2 -1,0 0,-2"
};

function getNewNodeFromShape(shapeName) {
    var newNode;

    if (_.contains(_.keys(shapeSpecs), shapeName)) {
        newNode = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        d3.select(newNode).attr("points", shapeSpecs[shapeName]);
    }
    else if (shapeName === "rect") {
        newNode = document.createElementNS("http://www.w3.org/2000/svg", shapeName);
        d3.select(newNode).attr("width", 1);
        d3.select(newNode).attr("height", 1);
    }
    else if (shapeName === "circle") {
        newNode = document.createElementNS("http://www.w3.org/2000/svg", shapeName);
        d3.select(newNode).attr("r", 1);
    }
    else {
        newNode = document.createElementNS("http://www.w3.org/2000/svg", shapeName);
    }

    return newNode;
}

function transformedBoundingBox(el, to) {
    var bb = el.getBBox();
    var svg = el.ownerSVGElement;
    if (!to) {
        to = svg;
    }
    var m = el.getTransformToElement(to);
    var pts = [svg.createSVGPoint(), svg.createSVGPoint(), svg.createSVGPoint(), svg.createSVGPoint()];
    pts[0].x = bb.x;
    pts[0].y = bb.y;
    pts[1].x = bb.x + bb.width;
    pts[1].y = bb.y;
    pts[2].x = bb.x + bb.width;
    pts[2].y = bb.y + bb.height;
    pts[3].x = bb.x;
    pts[3].y = bb.y + bb.height;

    var xMin = Infinity;
    var xMax = -Infinity;
    var yMin = Infinity;
    var yMax = -Infinity;

    for (var i = 0; i < pts.length; i++) {
        var pt = pts[i];
        pt = pt.matrixTransform(m);
        xMin = Math.min(xMin, pt.x);
        xMax = Math.max(xMax, pt.x);
        yMin = Math.min(yMin, pt.y);
        yMax = Math.max(yMax, pt.y);
    }
    bb.x = xMin;
    bb.width = xMax - xMin;
    bb.y = yMin;
    bb.height = yMax - yMin;
    return bb;
}