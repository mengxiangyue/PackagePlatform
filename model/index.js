const mongoose = require("mongoose");

mongoose.Promise = require('bluebird');
mongoose.connect("mongodb://localhost/package");
var db = mongoose.connection;
db.on('error', console.error.bind(console, '... connection error ...'));
db.once('open', function callback() {
    console.info("... db open ...");
});

require('./project')
require('./task')
require('./scheme')
require('./profile')

exports.Project = mongoose.model('Project');
exports.Task = mongoose.model('Task');
exports.Scheme = mongoose.model('Scheme');
exports.Profile = mongoose.model('Profile');