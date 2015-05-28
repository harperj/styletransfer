D3 Style transfer
=====

The D3 style transfer tool accepts two D3 deconstructions, a data source and a style target, and outputs a result
deconstruction with the data from the data source and the look of the style target.

### Installation

```
npm install
```

### Usage

Deconstructed charts from the [D3 Deconstructor](https://github.com/ucbvislab/d3-deconstructor) must be referred
to in a configuration JS object, which is exported as a node module.  Such files are formatted as shown below:

```
var tests = [
    {
        source_file: './data/weiglemc_scatter_2.json',
        target_file: './data/vallandingham_scatter.json'
    },
    {
        source_file: './data/vallandingham_scatter.json',
        target_file: './data/weiglemc_scatter_2.json'
    },
    ...
];

module.exports = tests;
```

This file must be referenced in `src/StyleTransfer.js`.  Change the line:

```
var transferTests = require('FILENAME');
```

and replace `FILENAME` with the name of your file.  For each `source_file` and `target_file` pair in your configuration
 the tool will generate a result chart.  Finally, to run style transfer, run the following command from the root directory:

 ```
 node src/StyleTransfer.js
 ```

 Results will be placed in `/view/data/next.json`.  Now, you can navigate to the folder `/view` and run a local HTTP
 server to view the results.  I recommend node's `http-server`.