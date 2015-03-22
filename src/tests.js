var tests = [
    {
        source_file: './data/weiglemc_scatter.json',
        target_file: './data/vallandingham_scatter.json'
    },
    {
        target_file: './data/weiglemc_scatter.json',
        source_file: './data/vallandingham_scatter.json'
    },
    {
        source_file: './data/dowson_bars.json',
        target_file: './data/mbostock_bars.json'
    },
    {
        target_file: './data/dowson_bars.json',
        source_file: './data/mbostock_bars.json'
    },
    {
        source_file: './data/leondutoit_bars.json',
        target_file: './data/npr_bars.json'
    },
    {
        source_file: './data/leondutoit_bars.json',
        target_file: './data/mbostock_neg_bars.json'
    },
    {
        target_file: './data/leondutoit_bars.json',
        source_file: './data/mbostock_bars_3.json'
    },
    {
        target_file: './data/leondutoit_bars.json',
        source_file: './data/mbostock_bars_3.json'
    },
    {
        source_file: './data/mbostock_bars.json',
        target_file: './data/leondutoit_dots.json'
    },
    {
        source_file: './data/dowson_bars.json',
        target_file: './data/leondutoit_dots.json'
    }
];

module.exports = tests;