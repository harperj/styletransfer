var tests = [
    {
        source_file: './data/iris.data.json',
        source_type: 'json_data',
        target_file: './data/vallandingham_scatter.json'
    },
    {
        source_file: './data/purple_scatter.json',
        target_file: './data/vallandingham_scatter.json'
    },
    {
        source_file: './data/iris.data.json',
        source_type: 'json_data',
        target_file: './data/weiglemc_scatter_2.json'
    },
    {
        source_file: './data/iris.data.json',
        source_type: 'json_data',
        target_file: './data/leondutoit_dots.json'
    },
    {
        source_file: './data/weiglemc_scatter_2.json',
        target_file: './data/vallandingham_scatter.json'
    },
    {
        source_file: './data/vallandingham_scatter.json',
        target_file: './data/weiglemc_scatter_2.json'
    },
    {
        source_file: './data/mbostock_bars.json',
        target_file: './data/vallandingham_scatter.json'
    },
    //{
    //    source_file: './data/dowson_bars.json',
    //    target_file: './data/mbostock_bars.json'
    //},
    //{
    //    source_type: 'json_data',
    //    source_file: './data/iris.data.json',
    //    target_file: './data/mbostock_bars.json'
    //},
    //{
    //    source_type: 'json_data',
    //    source_file: './data/iris.data.json',
    //    target_file: './data/dowson_bars.json'
    //},
    //{
    //    source_file: './data/mbostock_bars.json',
    //    target_file: './data/dowson_bars.json'
    //},
    //{
    //    source_file: './data/weiglemc_scatter.json',
    //    target_file: './data/dowson_bars.json'
    //},
    //{
    //    source_file: './data/dowson_bars.json',
    //    target_file: './data/weiglemc_scatter.json'
    //},
    //{
    //    source_file: './data/mbostock_bars.json',
    //    target_file: './data/excel_bars.json'
    //},
    //{
    //    source_file: './data/excel_bars.json',
    //    target_file: './data/mbostock_bars.json'
    //},
    //{
    //    source_file: './data/mbostock_bars.json',
    //    target_file: './data/leondutoit_dots.json'
    //},
    //{
    //    source_file: './data/example_dots.json',
    //    target_file: './data/example_bars.json'
    //},
    //{
    //    source_file: './data/example_bars.json',
    //    target_file: './data/example_dots.json'
    //},
    //{
    //    source_file: './data/leondutoit_dots.json',
    //    target_file: './data/example_dots.json'
    //},
    //{
    //    source_file: './data/leondutoit_dots.json',
    //    target_file: './data/example_bars.json'
    //},
    //{
    //    source_file: './data/dowson_bars.json',
    //    target_file: './data/leondutoit_dots.json'
    //},
    {
        source_type: 'json_data',
        source_file: './data/iris.data.json',
        target_file: './data/leondutoit_dots.json'
    }
    //{
    //    source_file: './data/my_line.json',
    //    target_file: './data/kuijjer_line.json'
    //},
    //{
    //    source_file: './data/kuijjer_line.json',
    //    target_file: './data/my_line.json'
    //}
];

module.exports = tests;