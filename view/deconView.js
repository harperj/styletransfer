var loadResults = function () {
    $("#transfers").empty();
    $.getJSON("data/targets.json", function (targets) {
        _.each(targets, function (target, i) {
            var targetDiv = $('<div class="resultRow"></div>');
            var header = $("<h2>Target " + i + "</h2>");

            targetDiv.append(header);
            $("#targets").append(targetDiv);

            var targetRowDiv = $('<div class="row">');
            targetDiv.append(targetRowDiv);

            var vis1Div = $('<div class="result-container row">');
            targetRowDiv.append(vis1Div);
            createVisContainer(vis1Div[0], target);
        });
    });
};

loadResults();