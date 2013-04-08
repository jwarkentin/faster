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
  fs.readFileSync(__dirname + '/faster.js').toString()
    .replace(/\/\/@version/g, pkgConfig.version)
    .replace('\/\/@platform-detect', fs.readFileSync(__dirname + '/platform-detect.js').toString())
    .replace('\/\/@semver', fs.readFileSync(__dirname + '/node_modules/semver/semver.js').toString())
];

console.log('Building faster.js ...');
var compiledFaster = writeFiles.join('\n\n');
fs.writeFileSync(__dirname + '/dist/faster.js', compiledFaster + sources.join('\n'));
process.stdout.write(execSync.stdout(__dirname + '/node_modules/uglify-js/bin/uglifyjs ' + __dirname + '/dist/faster.js -b --comments=all -o ' + __dirname + '/dist/faster.js'));

console.log('Building faster.min.js ...');
process.stdout.write(execSync.stdout(__dirname + '/node_modules/uglify-js/bin/uglifyjs ' + __dirname + '/dist/faster.js --comments -o ' + __dirname + '/dist/faster.min.js'));


console.log('Writing faster.test.js');
fs.writeFileSync(__dirname + '/dist/faster.test.js', compiledFaster);

// Write dev version -- not used for development on FasterJS, but for development on FasterJS function maps
console.log('Writing faster.dev.js...');
fs.writeFileSync(__dirname + '/dist/faster.dev.js', ';var fjsDev = true;' + fs.readFileSync(__dirname + '/dist/faster.min.js'));

console.log('All files built in ' + __dirname + '/dist');