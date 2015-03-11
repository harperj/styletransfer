var tests = {
    vertical_bars: {
        source_file: './data/bostock_bars.json',
        target_file: './data/miso_bars.json',
        transfers: [
            ['bars', 'bars'],
            ['yticks', 'yticks'],
            ['ylabels', 'ylabels'],
            ['xlabels', 'xlabels'],
            ['yaxis', 'yaxis']
        ],
        source_url: "http://misoproject.com/d3-chart/examples/basic.html",
        target_url: "http://bl.ocks.org/cpudney/raw/2248382/"
    },
    vertical_bars_rev: {
        target_file: './data/bostock_bars.json',
        source_file: './data/miso_bars.json',
        transfers: [
            ['bars', 'bars'],
            ['yticks', 'yticks'],
            ['ylabels', 'ylabels'],
            ['xlabels', 'xlabels'],
            ['yaxis', 'yaxis']
        ],
        source_url: "http://misoproject.com/d3-chart/examples/basic.html",
        target_url: "http://bl.ocks.org/cpudney/raw/2248382/"
    },
    scatter_plots: {
        source_file: './data/cereal_scatter.json',
        target_file: './data/vallandingham_scatter.json',
        transfers: [
            ['dots', 'dots'],
            ['xaxis', 'xaxis'],
            ['yaxis', 'yaxis'],
            ['xticks', 'xticks'],
            ['yticks', 'yticks'],
            ['xlabels', 'xlabels'],
            ['ylabels', 'ylabels']
        ]
    },
    scatter_plots_rev: {
        target_file: './data/cereal_scatter.json',
        source_file: './data/vallandingham_scatter.json',
        transfers: [
            ['dots', 'dots'],
            ['xaxis', 'xaxis'],
            ['yaxis', 'yaxis'],
            ['xticks', 'xticks'],
            ['yticks', 'yticks'],
            ['xlabels', 'xlabels'],
            ['ylabels', 'ylabels']
        ]
    },
    bar_2_dotplot: {
        source_file: './data/leondutoit_bars.json',
        target_file: './data/leondutoit_dots.json',
        transfers: [
            ['bars', 'dots'],
            ['xlabels', 'xlabels'],
            ['barlabels', 'dotlabels'],
            ['ylabels', 'ylabels']
        ]
    }
};

module.exports = tests;