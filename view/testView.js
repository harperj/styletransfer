//function replaceAll(string, find, replace) {
//    return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
//}
//
//function escapeRegExp(string) {
//    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
//}

var colorsReversed = false;

$(function () {
    var loaderNode = $("#loader-select");
    loadResults(loaderNode[0].value);
    loaderNode.change(function () {
        loadResults(loaderNode[0].value);
    });

    $("#flip-colors").click(function () {
        if (colorsReversed) {
            $("*").css({
                "color": "black",
                "background-color": "white"
            });
        }
        else {
            $("*").css({
                "color": "white",
                "background-color": "black"
            });
        }
        colorsReversed = !colorsReversed;
    });
});

var loadResults = function (value) {
    $("#transfers").empty();
    $.getJSON("data/" + value, function (tests) {
        _.each(tests, function (test, i) {
            var testDiv = $('<div class="resultRow"></div>');
            var header = $("<h2>Test " + i + "</h2>");

            testDiv.append(header);
            $("#transfers").append(testDiv);

            var resultRowDiv = $('<div class="row">');
            testDiv.append(resultRowDiv);

            var vis1Div = $('<div class="result-container row">');
            //var vis1Div = $('<div class="result-container col-md-4">');
            resultRowDiv.append(vis1Div);
            createVisContainer(vis1Div[0], test.sourceDecon);
            vis1Div.append($("<h3>Source Vis</h3>"));

            var vis2Div = $('<div class="result-container row">');
            //var vis2Div = $('<div class="result-container col-md-4">');
            resultRowDiv.append(vis2Div);
            createVisContainer(vis2Div[0], test.targetDecon);
            vis2Div.append($("<h3>Target Vis</h3>"));

            //var result1Div = $('<div class="result-container col-md-4">');
            var result1Div = $('<div class="result-container row">');
            resultRowDiv.append(result1Div);
            createVisContainer(result1Div[0], test.result);
            result1Div.append($("<h3>Result</h3>"));

            $("#transfers").append($("<hr>"));
        });
    });
};