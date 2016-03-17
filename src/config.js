/**
 * Created by harper on 12/9/14.
 */

var transfer_config = {
    niceifyRanges: true,
    forceLinearAxisZero: false,
    forceOnlyYAxisZero: false,
    position_transfer: "boundingbox",
    semiology_lin: {
        "xPosition": 1,
        "yPosition": 1,
        "width": 3,
        "height": 3,
        "area": 4,
        "fill": 5,
        "stroke": 5,
        "opacity": 6,
        "shape": 7,
        "text": 8
    },
    semiology_nom: {
        "xPosition": 1,
        "yPosition": 1,
        "fill": 3,
        "shape": 4,
        "stroke": 5,
        "opacity": 6,
        "width": 7,
        "height": 7,
        "area": 8,
        "text": 9
    }
};

module.exports = transfer_config;