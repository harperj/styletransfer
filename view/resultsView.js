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

        // SETUP TARGET ROW FIRST
        var targetRowDiv = $('<div class="resultRow"></div>');
        $("#targets").append(targetRowDiv);

        var emptyDiv = $('<div class="result-container row">');
        targetRowDiv.append(emptyDiv);

        createResultContainer(emptyDiv[0], {}, 1000, 800);
        _.each(rows[0].results, function(result) {
            var target = result.targetDecon;
            var visDiv = $('<div class="result-container row">');
            targetRowDiv.append(visDiv);
            createResultContainer(visDiv[0], target, 1000, 800);
        });



        _.each(rows, function (row, i) {
            var resultRowDiv = $('<div class="resultRow"></div>');
            $("#targets").append(resultRowDiv);

            var maxHeight = 0;
            row.results.forEach(function(result) {
                if (result.resultDecon.svg.height > maxHeight) {
                    maxHeight = result.resultDecon.svg.height;
                }
            });

            if (row.sourceDecon) {
                var visDiv = $('<div class="result-container row">');
                resultRowDiv.append(visDiv);
                createResultContainer(visDiv[0], row.sourceDecon, maxHeight, 800);
            }
            else {
                var visDiv = $('<div class="result-container row">');
                resultRowDiv.append(visDiv);
                createResultContainer(visDiv[0], {}, maxHeight, 800);
            }

            _.each(row.results, function(result) {
                var visDiv = $('<div class="result-container row">');
                resultRowDiv.append(visDiv);

                createResultContainer(visDiv[0], result.resultDecon, maxHeight);
            });
        });
    });
};

loadResults();