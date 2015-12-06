var createResultContainer = function (container, decon, maxHeight, fixedWidth) {
    var svgWidth = decon.svg ? decon.svg.width : 500;
    svgWidth = svgWidth > 800 ? 800 : svgWidth;
    svgWidth = fixedWidth ? fixedWidth : svgWidth;

    var svgHeight = decon.svg ? decon.svg.height : 1000;
    svgHeight = maxHeight ? maxHeight : svgHeight;
    //var svgWidth = 600;
    //var svgHeight = 350;

    var svg = d3.select(container)
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .style("border", "1px solid black")
        //.attr("height", "500px")
        //.attr("height", svgHeight / 5)
        //.attr("width", svgWidth / 5)
        .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight)
        //.attr("preserveAspectRatio", "xMidYMid meet")
        .node();
    renderVis(decon, svg);
};

var loadResults = function () {
    $("#transfers").empty();
    $.getJSON("data/eurovis_results.json", function (rows) {
        _.each(rows, function (row, i) {
            var targetDiv = $('<div class="resultRow"></div>');
            $("#targets").append(targetDiv);

            var maxHeight = 0;
            row.results.forEach(function(result) {
                if (result.resultDecon.svg.height > maxHeight) {
                    maxHeight = result.resultDecon.svg.height;
                }
            });

            if (row.sourceDecon) {
                var visDiv = $('<div class="result-container row">');
                targetDiv.append(visDiv);
                createResultContainer(visDiv[0], row.sourceDecon, maxHeight, 800);
            }
            else {
                var visDiv = $('<div class="result-container row">');
                targetDiv.append(visDiv);
                createResultContainer(visDiv[0], {}, maxHeight, 800);
            }

            _.each(row.results, function(result) {
                var visDiv = $('<div class="result-container row">');
                targetDiv.append(visDiv);

                createResultContainer(visDiv[0], result.resultDecon, maxHeight);
            });
        });
    });
};

loadResults();