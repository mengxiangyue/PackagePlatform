// start.js
require("babel-core/register")(
    {
        presets: ['stage-3','latest']
    }
);
require("babel-polyfill");

require("./app.js");
