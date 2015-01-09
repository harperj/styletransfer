/**
 * Created by harper on 12/9/14.
 */

var tests = {
    vertical_bars: {
        source_file: './data/miso_bars.json',
        target_file: './data/cpudney_bars.json',
        transfers: [
            ['bars', 'bars'],
            ['yticks', 'yticks'],
            ['ylabels', 'ylabels'],
            ['xlabels', 'xlabels']
        ],
        source_url: "http://misoproject.com/d3-chart/examples/basic.html",
        target_url: "http://bl.ocks.org/cpudney/raw/2248382/"
    },
    vertical_bars_rev: {
        source_file: './data/cpudney_bars.json',
        target_file: './data/miso_bars.json',
        transfers: [
            ['bars', 'bars'],
            ['yticks', 'yticks']
        ]
    },
    horizontal_bars: {
        source_file: './data/simplehoriz_bars.json',
        target_file: './data/dutoit_bars.json',
        transfers: [['bars', 'bars']],
        source_url: "http://hdnrnzk.me/2012/07/04/creating-a-bar-graph-using-d3js/",
        target_url: "http://bl.ocks.org/leondutoit/raw/6436923"
    },
    horizontal_bars_rev: {
        source_file: './data/dutoit_bars.json',
        target_file: './data/simplehoriz_bars.json',
        transfers: [['bars', 'bars']],
    },
    negative_bars: {
        source_file: './data/negative_bars.json',
        target_file: './data/dutoit_bars.json',
        transfers: [
            ['bars', 'bars'],
            ['xticks', 'xticks'],
            ['xlabels', 'xlabels']
        ]
    },
    bar_2_scatter: {
        source_file: './data/cpudney_bars.json',
        target_file: './data/cereal_scatter.json',
        transfers: [
            ['bars', 'dots'],
            ['yticks', 'yticks'],
            ['xticks', 'xticks']
        ]
    },
    scatter: {
        source_file: './data/vallandingham_scatter.json',
        target_file: './data/cereal_scatter.json',
        transfers: [
            ['dots', 'dots'],
            ['yticks', 'yticks'],
            ['ylabels', 'ylabels'],
            ['xticks', 'xticks'],
            ['xlabels', 'xlabels'],
        ]
    },
    scatter_rev: {
        source_file: './data/cereal_scatter.json',
        target_file: './data/vallandingham_scatter.json',
        transfers: [
            ['dots', 'dots'],
            ['yticks', 'yticks'],
            ['ylabels', 'ylabels'],
            ['xticks', 'xticks'],
            ['xlabels', 'xlabels'],
        ]
    }
};

module.exports = tests;