var fs = require('fs');
var execSync = require('execSync');

var pkgConfig = JSON.parse(fs.readFileSync(__dirname + '/package.json'));

// This could be an object with filenames as keys if we need to sort or do anything with the files
var jsFiles = fs.readdirSync(__dirname + '/src');

var sources = [];
jsFiles.forEach(function(filename) {
  sources.push(fs.readFileSync(__dirname + '/src/' + filename).toString());
});

var writeFiles = [
  fs.readFileSync(__dirname + '/node_modules/semver/semver.js').toString(),
  fs.readFileSync(__dirname + '/platform-detect.js').toString(),
  fs.readFileSync(__dirname + '/wrapper.js').toString()
    .replace('\/\/version', "version: '" + pkgConfig.version + "',")
    .replace('\/\/code', sources.join('\n'))
];

console.log('Building faster.js ...');
fs.writeFileSync(__dirname + '/dist/faster.js', writeFiles.join('\n\n'));
process.stdout.write(execSync.stdout(__dirname + '/node_modules/uglify-js/bin/uglifyjs ' + __dirname + '/dist/faster.js -b --comments=all -o ' + __dirname + '/dist/faster.js'));

console.log('Building faster.min.js ...');
process.stdout.write(execSync.stdout(__dirname + '/node_modules/uglify-js/bin/uglifyjs ' + __dirname + '/dist/faster.js -o ' + __dirname + '/dist/faster.min.js'));

// Build dev version -- not used for development on FasterJS, but for development on FasterJS function maps
console.log('Building faster.dev.js...');
fs.writeFileSync(__dirname + '/dist/faster.dev.js', ';var fjsDev = true;' + fs.readFileSync(__dirname + '/dist/faster.min.js'));

console.log('All files built in ' + __dirname + '/dist');