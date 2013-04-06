;(function() {
  // Determine platform/version
  var platform = getPlatform();

  // Given any version number with 1-3 potentially decimal separated digital (plus and before and after stuff)
  // this will try to make it valid semver (e.g. 17 -> 17.0.0, 1.2+build -> 1.2.0+build, also 17+ -> >=17).
  // For valid ranges and parsing see: https://github.com/isaacs/node-semver#ranges
  function convertToSemver(version) {
    var verparts = version.match(/([\D]*)([\d]+)(?:[.]([\d]+))?(?:[.]([\d]+))?(.*)/);
    if(verparts) {
      for(var i = 2; i < 5; i++) {
        if(typeof verparts[i] != 'string') {
          verparts[i] = '0';
        }
      }
    }

    var prefix = verparts[1];
    if(!prefix && verparts[5] == '+') {
      prefix = '>=';
      verparts[5] = '';
    }

    return prefix + verparts.slice(2, 5).join('.') + verparts[5];
  }

  var fasterJS = {
    getPlatform: function(alias) {
      alias = alias.toLowerCase();

      // Match the platform
      var platformFound = false;
      for(var pl in fasterJS.platformMatch) {
        if(alias == pl) {
          platformFound = true;
          break;
        }

        for(var k = 0; k < fasterJS.platformMatch[pl].length; k++) {
          if(alias == fasterJS.platformMatch[pl][k]) {
            platformFound = true;
            alias = pl;
            break;
          }
        }

        if(platformFound) break;
      }

      // If we couldn't match the platform to a known one in the map, then throw an error. We shouldn't
      // be referencing platforms that we don't have mapped. It could be a typo.
      if(!platformFound) {
        throw new Error("'" + alias + "' is not a valid platform. Make sure you spelled it right. Names are NOT case sensitive.");
      }

      return alias;
    },

    select: function select(obj) {
      if(!obj.name) {
        throw new Error("Won't select from an object without a name - it is helpful for debugging");
      }
      if(!obj.map || !Object.keys(obj.map).length) {
        throw new Error("Failed to select a function for '" + obj.name + "': No map found");
      }

      // Always search the map in a predictable way
      var mapKeys = Object.keys(obj.map).sort();

      var fallback;
      for(var i = 0; i < mapKeys.length; i++) {

        var mapKey = mapKeys[i];
        if(obj[mapKey] instanceof Function) {
          fallback = obj[mapKey];

          // The map key's definition can be a string or an array of strings to match the platform against
          var mapKeyDef = obj.map[mapKey];
          if(!(mapKeyDef instanceof Array)) {
            mapKeyDef = [mapKeyDef];
          }

          // Match the platform
          for(var j = 0; j < mapKeyDef.length; j++) {
            var defparts = mapKeyDef[j].split(/\s+(.+)?/);
            var defPlatform = fasterJS.getPlatform(defparts[0]);

            // If the defined platform isn't our platform then move on
            if(defPlatform != platform.name) continue;

            // If there is no version given in the definition then we match all versions, so we're done
            if(!defparts[1]) {
              return obj[mapKey];
            }

            // Every platform should have a version compare function defined in the platformComparators. We will
            // operate under this assumption for now.
            var versionCompareFunc = fasterJS.versionComparators[fasterJS.versionComparators[defPlatform] ? defPlatform : 'default'];
            if(versionCompareFunc(platform.version, defparts[1])) {
              return obj[mapKey];
            }
          }

        }

      }

      if(!fallback) {
        throw new Error("Cannot select a function for '" + obj.name + "' from an object with no functions");
      }

      // If we've made it this far then no map definitions matched. Look for a default, otherwise pick the first we find.
      return obj.map['default'] ? obj[obj.map['default']] : fallback;
    },

    // Abbreviations and aliases
    platformMatch: {
      node: ['njs', 'node.js'],
      firefox: ['ff'],
      chrome: ['chr', 'chromium']
    },

    // Platform version comparator functions
    versionComparators: {
      'default': function(version, range) {
        // Convert version to semver
        var newVersion = convertToSemver(version);
        var rangeVers = range.split(' - ');
        for(var i = 0; i < rangeVers.length; i++) {
          rangeVers[i] = convertToSemver(rangeVers[i]);
        }
        range = rangeVers.join(' - ');

        if(semver.valid(newVersion)) {
          return semver.satisfies(newVersion, range);
        }

        console.error("Couldn't convert '" + version + "' to valid semver");
        return false;
      }
    }
  };

  // Match to a valid platform we can work with
  try {
    platform.name = fasterJS.getPlatform(platform.name);
  } catch(err) {
    // The current platform is not supported - we'll just ignore the error and let everything select defaults
  }

  //code

  // Support AMD loaders
  if(typeof require !== 'undefined' && typeof define !== 'undefined') {
    define(function() {
      return fasterJS;
    });
  } else if(typeof exports !== 'undefined') {
    if(!module) module = {};
    exports = module.exports = fasterJS;
  } else {
    window.fasterJS = fasterJS;
  }
})();