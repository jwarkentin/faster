;(function() {
  ///////////////////////
  // Utility functions //
  ///////////////////////

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

  // Similar concept to Underscore's result function
  function result(obj, prop, args) {
    return (obj[prop] instanceof Function ? obj[prop].apply(obj, args) : obj[prop]);
  }

  // See: http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex#answer-6969486
  function regexpEscape(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  function matchId(obj, matchProps) {
    for(var prop in matchProps) {
      if(!(matchProps[prop] instanceof RegExp)) continue;

      if(typeof obj[prop] !== 'string' || !obj[prop].match(matchProps[prop])) {
        return false;
      }
    }

    return true;
  }


  ////////////////////////////
  // Browser detection code //
  ////////////////////////////

  var platform = {
    name: null,
    version: null,
    engine: null,
    compat: null
  };

  var platformObj = typeof(process) !== 'undefined' ? process : navigator;

  // NOTE: Version is also a regex defining how to parse the version, but it only needs to be specified if
  //       the version does not follow the convention 'name/version' in the user agent string.
  var platforms = [{
    identifier: { title: /node/i },
    name: 'node',
    version: function() {
      return platformObj.version;
    },
    engine: 'v8',
    compat: 'Netscape'
  }, {
    identifier: { vendor: /google/i },
    name: 'Chrome'
  }, {
    identifier: { userAgent: /firefox/i },
    name: 'Firefox'
  }, {
    identifier: { userAgent: /msie/i },
    name: 'msie'
  }];


  var browserDefaults = {
    version: function(platformData) {
      if(!platformData.name) {
        throw new Error('Cannot resolve platform version because no name has been set. Name must be set to determine the version.');
      }

      var match = navigator.userAgent.match(new RegExp(regexpEscape(platformData.name) + "/([\\S]+)", "i"));
      if(match) {
        return match[1];
      }
    },

    engine: function() {
      // Works at least for Firefox/Chrome/Safari/Opera/Konqueror (not IE, of course), others?
      var match = navigator.userAgent.match(new RegExp("\\) ([\\S]+?)/[\\S]+"));

      if(match) {
        var engine = match[1].toLowerCase();
        if(engine == 'applewebkit') {
          engine = 'webkit';
        }

        return engine;
      } else {
        // Try some others (or them together if there is ever an exception other than IE)
        match = navigator.userAgent.match(/(Trident)/i);

        if(match) {
          return match[1].toLowerCase();
        }
      }
    },

    compat: function() {
      return navigator.appName;
    }
  };

  function getPlatform() {
    if(platform.name) return platform;

    for(var i = 0; i < platforms.length; i++) {
      // Match with platform identifier - bob = platform object :)
      var bob = extend({}, browserDefaults, platforms[i]);
      if(!(bob.identifier instanceof Function ? bob.identifier() : matchId(platformObj, bob.identifier))) {
        continue;
      }

      // For things to succeed we need to resovle some specific properties in order first
      platform.name = result(bob, 'name', [platform]);
      platform.version = result(bob, 'version', [platform]);

      for(var prop in platform) {
        if(platform.hasOwnProperty(prop) && !platform[prop] && bob[prop]) {
          platform[prop] = result(bob, prop, [platform]);
        }
      }
    }

    return platform;
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
      return getPlatform;
    });
  } else if(typeof exports !== 'undefined') {
    if(!module) module = {};
    exports = module.exports = getPlatform;
  } else {
    window.getPlatform = getPlatform;
  }
})();