/**
 * Created by harper on 11/25/14.
 */

var Schema = require('./Schema');
var fs = require('fs');


var main = function() {
    var source_obj = JSON.parse(fs.readFileSync('data/murray_bars.json', 'utf8'));
    source_obj = source_obj[0];

    var target_obj = JSON.parse(fs.readFileSync('data/pudney_bars.json', 'utf8'));
    target_obj = target_obj[0];

    var sourceVis = Schema.fromJSON(source_obj);
    var targetVis = Schema.fromJSON(target_obj);
};

if (require.main === module) {
    main();
}