function replaceAll(string, find, replace) {
    return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

$.getJSON("../out.json", function(tests) {
    _.each(tests, function(test, testName) {
        var testDiv = $('<div"></div>');
        var header = $("<h2>" + replaceAll(testName, '_', ' ') + "</h2>");

        testDiv.append(header);
        $("#transfers").append(testDiv);

        var sourceImgDiv = $('<div class="row">');


        var vis1Div = $('<div class="result-container col-md-4">');
        //var img1 = $('<img class="sourceImg">');
        //img1.attr("src", "../" + test.source_file + ".png");
        //img1Div.append(img1);
        var vis1Width = test.sourceDecon.svg.width;
        var vis1Height = test.sourceDecon.svg.height;
        var vis1Svg = d3.select(vis1Div[0])
            .append("svg")
            .attr("width", "90%")
            .attr("viewBox", "0 0 " + vis1Width + " " + vis1Height)
            .attr("preserveAspectRatio", "xMidYMid")
            .node();

        vis1Div.append($("<h3>Source Vis</h3>"));

        sourceImgDiv.append(vis1Div);

        var vis2Div = $('<div class="result-container col-md-4">');
        //var img1 = $('<img class="sourceImg">');
        //img1.attr("src", "../" + test.source_file + ".png");
        //img1Div.append(img1);
        var vis2Width = test.targetDecon.svg.width;
        var vis2Height = test.targetDecon.svg.height;
        var vis2Svg = d3.select(vis2Div[0])
            .append("svg")
            .attr("width", "90%")
            .attr("viewBox", "0 0 " + vis2Width + " " + vis2Height)
            .attr("preserveAspectRatio", "xMidYMid")
            .node();

        vis2Div.append($("<h3>Target Vis</h3>"));

        sourceImgDiv.append(vis2Div);

        var svgWidth = test.result.svg ? test.result.svg.width : 1000;
        var svgHeight = test.result.svg ? test.result.svg.height : 1000;

        var result1Div = $('<div class="result-container col-md-4">');
        var svg = d3.select(result1Div[0])
            .append("svg")
            .attr("width", "90%")
            .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight)
            .attr("preserveAspectRatio", "xMidYMid")
            .node();

        sourceImgDiv.append(result1Div);
        testDiv.append(sourceImgDiv);
        createVis(test.result, svg);
        createVis(test.sourceDecon, vis1Svg);
        createVis(test.targetDecon, vis2Svg);
        result1Div.append($("<h3>Result</h3>"));

    });
});

function createVis(decon, svgNode) {
    for (var j = 0; j < decon.marks.length; ++j) {
        var vis = decon.marks[j];
        for (var i = 0; i < vis.ids.length; ++i) {
            var attrs = getAttrsFromInd(vis, i);
            var data = getDataFromInd(vis, i);
            var nodeAttrs = vis.nodeAttrs[i];
            drawNode(attrs, data, nodeAttrs, vis, svgNode);
        }
    }
}

function getAttrsFromInd(schema, ind) {
    var attrs = {};
    _.each(schema.attrs, function (val, attr) {
        attrs[attr] = val[ind];
    });
    return attrs;
}

function getDataFromInd(schema, ind) {
    var data = {};
    _.each(schema.data, function (val, attr) {
        data[attr] = val[ind];
    });
    return data;
}

function drawNode (attrs, data, nodeAttrs, schema, svg) {
    var newNode = getNewNodeFromShape(attrs['shape']);

    svg.appendChild(newNode);

    _.each(nodeAttrs, function (val, attr) {
        if (attr === "text") {
            $(newNode).text(val);
        }
        else {
            d3.select(newNode).attr(attr, val);
        }
    });

    _.each(attrs, function (val, attr) {
        if (val !== null) {
            d3.select(newNode).style(attr, val);
        }
    });
    d3.select(newNode).style("vector-effect", "non-scaling-stroke");

    var newNodeBoundingBox = transformedBoundingBox(newNode);
    var newScale = svg.createSVGTransform();
    var widthScale = attrs['width'] / newNodeBoundingBox.width;
    var heightScale = attrs['height'] / newNodeBoundingBox.height;
    if (isNaN(widthScale)) {
        widthScale = 1;
    }
    if (isNaN(heightScale)) {
        heightScale = 1;
    }
    newScale.setScale(widthScale, heightScale);

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
    //localCurrentPt.matrixTransform(newScale.matrix);

    var localDestinationPt = newNodeDestinationGlobalPt.matrixTransform(globalToLocal);
    //localDestinationPt.matrixTransform(newScale.matrix);

    var xTranslate = localDestinationPt.x - localCurrentPt.x;
    var yTranslate = localDestinationPt.y - localCurrentPt.y;
    newTranslate.setTranslate(xTranslate, yTranslate);

    newNode.transform.baseVal.appendItem(newTranslate);

    var newRotate = svg.createSVGTransform();
    newRotate.setRotate(+attrs['rotation'], 0, 0);
    newNode.transform.baseVal.appendItem(newRotate);

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
