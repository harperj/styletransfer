var fs = require('fs');
var CircularJSON = require('circular-json');

var StyleTransfer = require('./StyleTransfer');
var util = require('./util');
var config = require('./config');

var targets = [
    './data/result_scatter_1.json',
    './data/dowson_bars.json',
    './data/result_dots_2.json',
    './data/my_line.json'
];

var sources = [
    {
        file: './data/cars_rollup.data.json',
        type: 'json_data'
    },
    {
        file: './data/anscombe1.json',
        type: 'deconstruction'
    },
    {
        file: './data/result_dots_1.json',
        type: 'deconstruction'
    },
    {
        file: './data/npr_bars.json',
        type: 'deconstruction'
    },
    {
        file: './data/5308_bars.json',
        type: 'deconstruction'
    },
    {
        file: './data/leondutoit_dots.json',
        type: 'deconstruction'
    },
    {
        file: './data/custody.data.json',
        type: 'json_data'
    }
];




var generateResults = function () {
    var results = [];
    sources.forEach(function (source) {
        var sourceData;
        var row = {
            results: []
        };
        var sourceDecon;

        if (typeof(source.type) === "undefined" || source.type === "deconstruction") {
            row.sourceDecon = util.loadDeconstructedVis(source.file);
            sourceData = StyleTransfer.extractDataFromDeconstruction(row.sourceDecon);
        }
        else if (source.type === "json_data") {
            sourceData = util.loadJSONData(source.file)
        }
        else if (source.type === "vegalite") {
            sourceData = util.loadVegaLiteVis(source.file)
        }

        targets.forEach(function (target) {
            var testResult = {};
            testResult.targetDecon = util.loadDeconstructedVis(target);
            testResult.resultDecon = StyleTransfer.transferChart(sourceData, testResult.targetDecon);
            row.results.push(testResult);
        });

        results.push(row);
    });
    fs.writeFile('view/data/eurovis_results.json', CircularJSON.stringify(results));
};

if (require.main === module) {
    generateResults();
}