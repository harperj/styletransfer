var tests = {
    //vertical_bars: {
    //    source_file: './data/mbostock_bars.json',
    //    target_file: './data/miso_bars.json',
    //    transfers: [
    //        ['bars', 'bars'],
    //        ['yticks', 'yticks'],
    //        ['ylabels', 'ylabels'],
    //        ['xlabels', 'xlabels'],
    //        ['yaxis', 'yaxis']
    //    ],
    //    source_url: "http://misoproject.com/d3-chart/examples/basic.html",
    //    target_url: "http://bl.ocks.org/cpudney/raw/2248382/"
    //},
    //vertical_bars_rev: {
    //    target_file: './data/bostock_bars.json',
    //    source_file: './data/miso_bars.json',
    //    transfers: [
    //        ['bars', 'bars'],
    //        ['yticks', 'yticks'],
    //        ['ylabels', 'ylabels'],
    //        ['xlabels', 'xlabels'],
    //        ['yaxis', 'yaxis']
    //    ],
    //    source_url: "http://misoproject.com/d3-chart/examples/basic.html",
    //    target_url: "http://bl.ocks.org/cpudney/raw/2248382/"
    //},
    scatter_plots: {
        source_file: './data/weiglemc_scatter.json',
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
    }
    //scatter_plots_rev: {
    //    target_file: './data/cereal_scatter.json',
    //    source_file: './data/vallandingham_scatter.json',
    //    transfers: [
    //        ['dots', 'dots'],
    //        ['xaxis', 'xaxis'],
    //        ['yaxis', 'yaxis'],
    //        ['xticks', 'xticks'],
    //        ['yticks', 'yticks'],
    //        ['xlabels', 'xlabels'],
    //        ['ylabels', 'ylabels']
    //    ]
    //},
    //bar_2_dotplot: {
    //    source_file: './data/leondutoit_bars.json',
    //    target_file: './data/leondutoit_dots.json',
    //    transfers: [
    //        ['bars', 'dots'],
    //        ['xlabels', 'xlabels'],
    //        ['barlabels', 'dotlabels'],
    //        ['ylabels', 'ylabels']
    //    ]
    //},
    //bar_2_dotplot_diffdata: {
    //    source_file: './data/food_bars.json',
    //    target_file: './data/leondutoit_dots.json',
    //    transfers: [
    //        ['bars', 'dots'],
    //        ['xlabels', 'xlabels'],
    //        ['xaxis', 'xaxis'],
    //        ['ylabels', 'ylabels']
    //    ]
    //},
    //food_to_leondutoit_bars: {
    //    source_file: './data/food_bars.json',
    //    target_file: './data/dutoit_bars.json',
    //    transfers: [
    //        ['bars', 'bars'],
    //        ['xaxis', 'xaxis'],
    //        ['xlabels', 'xlabels'],
    //        ['ylabels', 'ylabels']
    //    ]
    //},
    //food_bar_2_economist_bar: {
    //    source_file: './data/food_bars.json',
    //    target_file: './data/bostock_bars_economist.json',
    //    transfers: [
    //        ['bars', 'bars'],
    //        ['xlabels', 'ylabels'],
    //        ['ylabels', 'xlabels'],
    //        ['yticks', 'xticks'],
    //        ['xaxis', 'yaxis'],
    //        ['yaxis', 'xaxis'],
    //        ['xticks', 'yticks']
    //    ],
    //    source_url: "http://misoproject.com/d3-chart/examples/basic.html",
    //    target_url: "http://bl.ocks.org/cpudney/raw/2248382/"
    //},
    //economist_bar_2_food_bar: {
    //    target_file: './data/food_bars.json',
    //    source_file: './data/bostock_bars_economist.json',
    //    transfers: [
    //        ['bars', 'bars'],
    //        ['ylabels', 'xlabels'],
    //        ['xlabels', 'ylabels'],
    //        ['xticks', 'yticks'],
    //        ['xaxis', 'yaxis'],
    //        ['yaxis', 'xaxis'],
    //        ['yticks', 'xticks']
    //    ],
    //    source_url: "http://misoproject.com/d3-chart/examples/basic.html",
    //    target_url: "http://bl.ocks.org/cpudney/raw/2248382/"
    //}
};

module.exports = tests;