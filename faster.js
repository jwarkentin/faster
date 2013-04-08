/**
 * Faster.js Javascript performance library v//@version
 *
 * Author: Justin Warkentin
 * License: MIT License
 *
 * Copyright 2013 Justin Warkentin
 *
 * @preserve
 */

/**
 * This file is the main Faster.js build file. It should not be included directly. The final faster.js file
 * in the 'dist' directory is modified and extended by the build script.
 */

;(function() {
  //@platform-detect
  //@semver

  //////////////////////
  // Helper Functions //
  //////////////////////


  function extend(toObj) {
    var exObjs = Array.prototype.slice.call(arguments, 1);
    for(var i = 0; i < exObjs.length; i++) {
      var fromObj = exObjs[i];
      for(var prop in fromObj) {
        if(fromObj.hasOwnProperty(prop)) {
          toObj[prop] = fromObj[prop];
        }
      }
    }

    return toObj;
  }


  // Helper for isEqual()
  function getType(obj) {
    var objType = typeof(obj);
    if(objType != 'object') return objType;

    if(obj instanceof Array) return 'array';
    if(obj instanceof RegExp) return 'regexp';

    return objType;
  }

  // Helper for isEqual()
  function keys(obj) {
    if(Object.keys) return Object.keys(obj);

    var objKeys = [];
    for(var prop in obj) {
      if(obj.hasOwnProperty(prop)) {
        objKeys.push(prop);
      }
    }

    return objKeys;
  }

  function isEqual(item1, item2, deep) {
    if(item1 == item2) return true;

    // Type check
    var type1 = getType(item1);
    var type2 = getType(item2);
    if(type1 != type2) return false;

    if(type1 == 'array') {
      if(item1.length != item2.length) return false;

      for(var i = 0; i < item1.length; i++) {
        if(deep) {
          if(!isEqual(item1[i], item2[i], true)) {
            return false;
          }
        } else {
          if(item1[i] != item2[i]) return false;
        }
      }

      return true;
    } else if(type1 == 'object') {
      var o1Keys = keys(item1);
      var o2Keys = keys(item2);

      if(!isEqual(o1Keys, o2Keys)) return false;

      for(var i = 0; i < o1Keys.length; i++) {
        if(deep) {
          if(!isEqual(item1[o1Keys[i]], item2[o1Keys[i]], deep)) {
            return false;
          }
        } else {
          if(item1[o1Keys[i]] != item2[o1Keys[i]]) return false;
        }
      }

      return true;
    } else if(type1 == 'regexp') {
      return item1.toString() == item2.toString();
    }

    return false;
  }

  function stringifyMap(map) {
    var newMap = {};

    for(var prop in map) {
      if(map.hasOwnProperty(prop)) {
        if(map[prop] instanceof Function) newMap[prop] = map[prop].toString();
        else newMap[prop] = map[prop];
      }
    }

    return JSON.stringify(newMap);
  }

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


  ///////////////////
  // Faster.js Code //
  ///////////////////

  var fjsCacheKey = 'fjs';

  // Determine platform/version
  var platform = getPlatform();

  var fasterJS = {
    // Used to know when to clear the cache
    version: '//@version',

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

    clearCache: function() {
      if(typeof(localStorage) !== 'undefined') {
        for(var key in localStorage) {
          if(key.substr(0, fjsCacheKey.length + 1) == fjsCacheKey + ':') {
            delete localStorage[key];
          }
        }
      }
    },

    cacheMapKey: function(obj, mapKey) {
      if(typeof(localStorage) !== 'undefined') {
        var cacheKey = fjsCacheKey + ':' + obj.name;
        delete localStorage[cacheKey];

        var cacheObj = {mapKey: mapKey};
        if(typeof(fjsDev) !== 'undefined' && fjsDev) {
          cacheObj.map = stringifyMap(obj.map);
          cacheObj.fnSource = obj[mapKey].toString();
        }

        localStorage[fjsCacheKey + ':' + obj.name] = JSON.stringify(cacheObj);
      }

      return obj[mapKey];
    },

    getObjCache: function(obj) {
      if(typeof localStorage !== 'undefined') {
        var cacheKey = fjsCacheKey + ':' + obj.name;
        var cachedMap = localStorage[cacheKey];

        if(cachedMap) {
          cachedMap = JSON.parse(cachedMap);
          if(typeof(fjsDev) !== 'undefined' && fjsDev) {
            // If the map or the function source for the selected mapKey has changed, refresh the cache
            var objMap = stringifyMap(obj.map);
            if(!isEqual(cachedMap.map, objMap, true) || cachedMap.fnSource != obj[cachedMap.mapKey].toString()) {
              delete localStorage[cacheKey];
              return false;
            }
          }

          return obj[cachedMap.mapKey] || false;
        }
      }

      return false;
    },

    /**
     * This is where all the magic happens. Given a Faster.js module object it will return the fastest version of the function
     * for the current platform. It uses the map normally, unless 'test' is true. It caches the decision in localStorage if
     * the current platform supports it to make future page loads quicker.
     *
     * @param  {object} obj The function map object
     *
     * @return {function}   The fastest version of the function for the current platform
     */
    select: function select(obj, options) {
      if(!obj.name) {
        throw new Error("Won't select from an object without a name - it is helpful for debugging");
      }
      if(!obj.map || !Object.keys(obj.map).length) {
        throw new Error("Failed to select a function for '" + obj.name + "': No map found");
      }

      // Default options
      options = extend({
        platform: platform,   // By default select based on the current platform as determined by platform-detect.
                              // This is mostly only useful for unit testing.
        test: false,          // Test for the fastest version instead of using the defined map
        forceTest: false,     // If 'test' is true, but we have cached a function mapKey for the given map object,
                              // we will return the cached version if the actual function code hasn't changed unless
                              // this is true.
        updateMap: true       // When 'test' is true, should we automatically update the map
      }, options || {});


      // Check cache first
      var cachedResult = fasterJS.getObjCache(obj);
      if(cachedResult) return cachedResult;


      // Always search the map in a predictable way
      var mapKeys = Object.keys(obj.map).sort();

      var fallback;
      for(var i = 0; i < mapKeys.length; i++) {

        var mapKey = mapKeys[i];
        if(obj[mapKey] instanceof Function) {
          fallback = mapKey;

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
              return fasterJS.cacheMapKey(obj, mapKey);
            }

            // Every platform should have a version compare function defined in the platformComparators. We will
            // operate under this assumption for now.
            var versionCompareFunc = fasterJS.versionComparators[fasterJS.versionComparators[defPlatform] ? defPlatform : 'default'];
            if(versionCompareFunc(platform.version, defparts[1])) {
              return fasterJS.cacheMapKey(obj, mapKey);
            }
          }

        }

      }

      if(!fallback) {
        throw new Error("Cannot select a function for '" + obj.name + "' from an object with no functions");
      }

      // If we've made it this far then no map definitions matched. Look for a default, otherwise pick the first we find.
      var defaultMapKey = obj.map['default'] ? obj.map['default'] : fallback;
      if(defaultMapKey instanceof Function) defaultMapKey = defaultMapKey();
      return fasterJS.cacheMapKey(obj, defaultMapKey);
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

  // Clear the cache if the version number has changed
  if(typeof(localStorage) !== 'undefined' && localStorage[fjsCacheKey + ':version'] != fasterJS.version) {
    fasterJS.clearCache();
    localStorage[fjsCacheKey + ':version'] = fasterJS.version;
  }


  // Only used for unit tests to allow access to otherwise private parts of the library
  if(typeof QUnit !== 'undefined') {
    // Function for testing
    getPlatform.getRef = function(name) {
      return eval(name + ';');
    };
  }


  // Support AMD loaders
  if(typeof require !== 'undefined' && typeof define !== 'undefined') {
    define(function() {
      return fasterJS;
    });
  } else if(typeof exports !== 'undefined') {
    if(!module) module = {};
    exports = module.exports = fasterJS;
  } else {
    window.fasterJS = window.fjs = fasterJS;
  }
})();