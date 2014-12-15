/**
 * Created by harper on 12/9/14.
 */

var tests = {
    vertical_bars: {
        files: ['./data/miso_bars.json', './data/pudney_bars.json'],
        source_url: "http://misoproject.com/d3-chart/examples/basic.html",
        target_url: "http://bl.ocks.org/cpudney/raw/2248382/",
        do_reverse: true,
        description: "Two vertical bar charts: http://misoproject.com/d3-chart/examples/basic.html and http://bl.ocks.org/cpudney/2248382"
    },
    horizontal_bars: {
        files: ['./data/simplehoriz_bars.json', './data/dutoit_bars.json'],
        source_url: "http://hdnrnzk.me/2012/07/04/creating-a-bar-graph-using-d3js/",
        target_url: "",
        do_reverse: true,
        description: "Two horizontal bar charts"
    },
    negative_bars: {
        files: ['./data/negative_bars.json', './data/dutoit_bars.json'],
        do_reverse: true,
        description: "Negative bar chart and a horizontal non-negative bar chart"
    },
    bar_2_scatter: {
        files: ['./data/pudney_bars.json', './data/cereal_scatter.json'],
        do_reverse: true,
        description: "Bar chart and a scatterplot"
    },
    scatter: {
        files: ['./data/vallandingham_scatter.json', './data/cereal_scatter.json'],
        do_reverse: true,
        description: "two scatterplots"
    }
};

module.exports = tests;