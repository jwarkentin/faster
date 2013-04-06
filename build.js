var fs = require('fs');
var exec = require('child_process').exec;

// This could be an object with filenames as keys if we need to sort or do anything with the files
var jsFiles = fs.readdirSync(__dirname + '/src');

var sources = [];
jsFiles.forEach(function(filename) {
  sources.push(fs.readFileSync(__dirname + '/src/' + filename).toString());
});

var writeFiles = [
  fs.readFileSync(__dirname + '/node_modules/semver/semver.js').toString(),
  fs.readFileSync(__dirname + '/platform-detect.js').toString(),
  fs.readFileSync(__dirname + '/wrapper.js').toString().replace('\/\/code', sources.join('\n'))
];

fs.writeFileSync(__dirname + '/dist/faster.js', writeFiles.join('\n\n'));

exec(__dirname + '/node_modules/uglify-js/bin/uglifyjs ' + __dirname + '/dist/faster.js -b --comments=all -o ' + __dirname + '/dist/faster.js');
exec(__dirname + '/node_modules/uglify-js/bin/uglifyjs ' + __dirname + '/dist/faster.js -o ' + __dirname + '/dist/faster.min.js');