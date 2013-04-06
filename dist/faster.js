(function(exports) {
    // nothing in here is node-specific.
    // See http://semver.org/
    // This implementation is a *hair* less strict in that it allows
    // v1.2.3 things, and also tags that don't begin with a char.
    var semver = "\\s*[v=]*\\s*([0-9]+)" + "\\.([0-9]+)" + "\\.([0-9]+)" + "(-[0-9]+-?)?" + "([a-zA-Z-+][a-zA-Z0-9-.:]*)?", exprComparator = "^((<|>)?=?)s*(" + semver + ")$|^$", xRangePlain = "[v=]*([0-9]+|x|X|\\*)" + "(?:\\.([0-9]+|x|X|\\*)" + "(?:\\.([0-9]+|x|X|\\*)" + "([a-zA-Z-][a-zA-Z0-9-.:]*)?)?)?", xRange = "((?:<|>)=?)?\\s*" + xRangePlain, exprSpermy = "(?:~>?)" + xRange, expressions = exports.expressions = {
        parse: new RegExp("^\\s*" + semver + "\\s*$"),
        parsePackage: new RegExp("^\\s*([^/]+)[-@](" + semver + ")\\s*$"),
        parseRange: new RegExp("^\\s*(" + semver + ")\\s+-\\s+(" + semver + ")\\s*$"),
        validComparator: new RegExp("^" + exprComparator + "$"),
        parseXRange: new RegExp("^" + xRange + "$"),
        parseSpermy: new RegExp("^" + exprSpermy + "$")
    };
    Object.getOwnPropertyNames(expressions).forEach(function(i) {
        exports[i] = function(str) {
            return ("" + (str || "")).match(expressions[i]);
        };
    });
    exports.rangeReplace = ">=$1 <=$7";
    exports.clean = clean;
    exports.compare = compare;
    exports.rcompare = rcompare;
    exports.satisfies = satisfies;
    exports.gt = gt;
    exports.gte = gte;
    exports.lt = lt;
    exports.lte = lte;
    exports.eq = eq;
    exports.neq = neq;
    exports.cmp = cmp;
    exports.inc = inc;
    exports.valid = valid;
    exports.validPackage = validPackage;
    exports.validRange = validRange;
    exports.maxSatisfying = maxSatisfying;
    exports.replaceStars = replaceStars;
    exports.toComparators = toComparators;
    function stringify(version) {
        var v = version;
        return [ v[1] || "", v[2] || "", v[3] || "" ].join(".") + (v[4] || "") + (v[5] || "");
    }
    function clean(version) {
        version = exports.parse(version);
        if (!version) return version;
        return stringify(version);
    }
    function valid(version) {
        if (typeof version !== "string") return null;
        return exports.parse(version) && version.trim().replace(/^[v=]+/, "");
    }
    function validPackage(version) {
        if (typeof version !== "string") return null;
        return version.match(expressions.parsePackage) && version.trim();
    }
    // range can be one of:
    // "1.0.3 - 2.0.0" range, inclusive, like ">=1.0.3 <=2.0.0"
    // ">1.0.2" like 1.0.3 - 9999.9999.9999
    // ">=1.0.2" like 1.0.2 - 9999.9999.9999
    // "<2.0.0" like 0.0.0 - 1.9999.9999
    // ">1.0.2 <2.0.0" like 1.0.3 - 1.9999.9999
    var starExpression = /(<|>)?=?\s*\*/g, starReplace = "", compTrimExpression = new RegExp("((<|>)?=|<|>)\\s*(" + semver + "|" + xRangePlain + ")", "g"), compTrimReplace = "$1$3";
    function toComparators(range) {
        var ret = (range || "").trim().replace(expressions.parseRange, exports.rangeReplace).replace(compTrimExpression, compTrimReplace).split(/\s+/).join(" ").split("||").map(function(orchunk) {
            return orchunk.split(" ").map(replaceXRanges).map(replaceSpermies).map(replaceStars).join(" ").trim();
        }).map(function(orchunk) {
            return orchunk.trim().split(/\s+/).filter(function(c) {
                return c.match(expressions.validComparator);
            });
        }).filter(function(c) {
            return c.length;
        });
        return ret;
    }
    function replaceStars(stars) {
        return stars.trim().replace(starExpression, starReplace);
    }
    // "2.x","2.x.x" --> ">=2.0.0- <2.1.0-"
    // "2.3.x" --> ">=2.3.0- <2.4.0-"
    function replaceXRanges(ranges) {
        return ranges.split(/\s+/).map(replaceXRange).join(" ");
    }
    function replaceXRange(version) {
        return version.trim().replace(expressions.parseXRange, function(v, gtlt, M, m, p, t) {
            var anyX = !M || M.toLowerCase() === "x" || M === "*" || !m || m.toLowerCase() === "x" || m === "*" || !p || p.toLowerCase() === "x" || p === "*", ret = v;
            if (gtlt && anyX) {
                (!M || M === "*" || M.toLowerCase() === "x") && (M = 0);
                (!m || m === "*" || m.toLowerCase() === "x") && (m = 0);
                (!p || p === "*" || p.toLowerCase() === "x") && (p = 0);
                ret = gtlt + M + "." + m + "." + p + "-";
            } else if (!M || M === "*" || M.toLowerCase() === "x") {
                ret = "*";
            } else if (!m || m === "*" || m.toLowerCase() === "x") {
                // append "-" onto the version, otherwise
                // "1.x.x" matches "2.0.0beta", since the tag
                // *lowers* the version value
                ret = ">=" + M + ".0.0- <" + (+M + 1) + ".0.0-";
            } else if (!p || p === "*" || p.toLowerCase() === "x") {
                ret = ">=" + M + "." + m + ".0- <" + M + "." + (+m + 1) + ".0-";
            }
            return ret;
        });
    }
    // ~, ~> --> * (any, kinda silly)
    // ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
    // ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
    // ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
    // ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
    // ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
    function replaceSpermies(version) {
        return version.trim().replace(expressions.parseSpermy, function(v, gtlt, M, m, p, t) {
            if (gtlt) throw new Error("Using '" + gtlt + "' with ~ makes no sense. Don't do it.");
            if (!M || M.toLowerCase() === "x") {
                return "";
            }
            // ~1 == >=1.0.0- <2.0.0-
            if (!m || m.toLowerCase() === "x") {
                return ">=" + M + ".0.0- <" + (+M + 1) + ".0.0-";
            }
            // ~1.2 == >=1.2.0- <1.3.0-
            if (!p || p.toLowerCase() === "x") {
                return ">=" + M + "." + m + ".0- <" + M + "." + (+m + 1) + ".0-";
            }
            // ~1.2.3 == >=1.2.3- <1.3.0-
            t = t || "-";
            return ">=" + M + "." + m + "." + p + t + " <" + M + "." + (+m + 1) + ".0-";
        });
    }
    function validRange(range) {
        range = replaceStars(range);
        var c = toComparators(range);
        return c.length === 0 ? null : c.map(function(c) {
            return c.join(" ");
        }).join("||");
    }
    // returns the highest satisfying version in the list, or undefined
    function maxSatisfying(versions, range) {
        return versions.filter(function(v) {
            return satisfies(v, range);
        }).sort(compare).pop();
    }
    function satisfies(version, range) {
        version = valid(version);
        if (!version) return false;
        range = toComparators(range);
        for (var i = 0, l = range.length; i < l; i++) {
            var ok = false;
            for (var j = 0, ll = range[i].length; j < ll; j++) {
                var r = range[i][j], gtlt = r.charAt(0) === ">" ? gt : r.charAt(0) === "<" ? lt : false, eq = r.charAt(!!gtlt) === "=", sub = !!eq + !!gtlt;
                if (!gtlt) eq = true;
                r = r.substr(sub);
                r = r === "" ? r : valid(r);
                ok = r === "" || eq && r === version || gtlt && gtlt(version, r);
                if (!ok) break;
            }
            if (ok) return true;
        }
        return false;
    }
    // return v1 > v2 ? 1 : -1
    function compare(v1, v2) {
        var g = gt(v1, v2);
        return g === null ? 0 : g ? 1 : -1;
    }
    function rcompare(v1, v2) {
        return compare(v2, v1);
    }
    function lt(v1, v2) {
        return gt(v2, v1);
    }
    function gte(v1, v2) {
        return !lt(v1, v2);
    }
    function lte(v1, v2) {
        return !gt(v1, v2);
    }
    function eq(v1, v2) {
        return gt(v1, v2) === null;
    }
    function neq(v1, v2) {
        return gt(v1, v2) !== null;
    }
    function cmp(v1, c, v2) {
        switch (c) {
          case ">":
            return gt(v1, v2);

          case "<":
            return lt(v1, v2);

          case ">=":
            return gte(v1, v2);

          case "<=":
            return lte(v1, v2);

          case "==":
            return eq(v1, v2);

          case "!=":
            return neq(v1, v2);

          case "===":
            return v1 === v2;

          case "!==":
            return v1 !== v2;

          default:
            throw new Error("Y U NO USE VALID COMPARATOR!? " + c);
        }
    }
    // return v1 > v2
    function num(v) {
        return v === undefined ? -1 : parseInt((v || "0").replace(/[^0-9]+/g, ""), 10);
    }
    function gt(v1, v2) {
        v1 = exports.parse(v1);
        v2 = exports.parse(v2);
        if (!v1 || !v2) return false;
        for (var i = 1; i < 5; i++) {
            v1[i] = num(v1[i]);
            v2[i] = num(v2[i]);
            if (v1[i] > v2[i]) return true; else if (v1[i] !== v2[i]) return false;
        }
        // no tag is > than any tag, or use lexicographical order.
        var tag1 = v1[5] || "", tag2 = v2[5] || "";
        // kludge: null means they were equal.  falsey, and detectable.
        // embarrassingly overclever, though, I know.
        return tag1 === tag2 ? null : !tag1 ? true : !tag2 ? false : tag1 > tag2;
    }
    function inc(version, release) {
        version = exports.parse(version);
        if (!version) return null;
        var parsedIndexLookup = {
            major: 1,
            minor: 2,
            patch: 3,
            build: 4
        };
        var incIndex = parsedIndexLookup[release];
        if (incIndex === undefined) return null;
        var current = num(version[incIndex]);
        version[incIndex] = current === -1 ? 1 : current + 1;
        for (var i = incIndex + 1; i < 5; i++) {
            if (num(version[i]) !== -1) version[i] = "0";
        }
        if (version[4]) version[4] = "-" + version[4];
        version[5] = "";
        return stringify(version);
    }
})(typeof exports === "object" ? exports : semver = {});

(function() {
    ///////////////////////
    // Utility functions //
    ///////////////////////
    function extend(toObj) {
        var exObjs = Array.prototype.slice.call(arguments, 1);
        for (var i = 0; i < exObjs.length; i++) {
            var fromObj = exObjs[i];
            for (var prop in fromObj) {
                if (fromObj.hasOwnProperty(prop)) {
                    toObj[prop] = fromObj[prop];
                }
            }
        }
        return toObj;
    }
    // Similar concept to Underscore's result function
    function result(obj, prop, args) {
        return obj[prop] instanceof Function ? obj[prop].apply(obj, args) : obj[prop];
    }
    // See: http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex#answer-6969486
    function regexpEscape(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }
    function matchId(obj, matchProps) {
        for (var prop in matchProps) {
            if (!(matchProps[prop] instanceof RegExp)) continue;
            if (typeof obj[prop] !== "string" || !obj[prop].match(matchProps[prop])) {
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
    var platformObj = typeof process !== "undefined" ? process : navigator;
    // NOTE: Version is also a regex defining how to parse the version, but it only needs to be specified if
    //       the version does not follow the convention 'name/version' in the user agent string.
    var platforms = [ {
        identifier: {
            title: /node/i
        },
        name: "node",
        version: function() {
            return platformObj.version;
        },
        engine: "v8",
        compat: "Netscape"
    }, {
        identifier: {
            vendor: /google/i
        },
        name: "Chrome"
    }, {
        identifier: {
            userAgent: /firefox/i
        },
        name: "Firefox"
    }, {
        identifier: {
            userAgent: /msie/i
        },
        name: "msie"
    } ];
    var browserDefaults = {
        version: function(platformData) {
            if (!platformData.name) {
                throw new Error("Cannot resolve platform version because no name has been set. Name must be set to determine the version.");
            }
            var match = navigator.userAgent.match(new RegExp(regexpEscape(platformData.name) + "/([\\S]+)", "i"));
            if (match) {
                return match[1];
            }
        },
        engine: function() {
            // Works at least for Firefox/Chrome/Safari/Opera/Konqueror (not IE, of course), others?
            var match = navigator.userAgent.match(new RegExp("\\) ([\\S]+?)/[\\S]+"));
            if (match) {
                var engine = match[1].toLowerCase();
                if (engine == "applewebkit") {
                    engine = "webkit";
                }
                return engine;
            } else {
                // Try some others (or them together if there is ever an exception other than IE)
                match = navigator.userAgent.match(/(Trident)/i);
                if (match) {
                    return match[1].toLowerCase();
                }
            }
        },
        compat: function() {
            return navigator.appName;
        }
    };
    function getPlatform() {
        if (platform.name) return platform;
        for (var i = 0; i < platforms.length; i++) {
            // Match with platform identifier - bob = platform object :)
            var bob = extend({}, browserDefaults, platforms[i]);
            if (!(bob.identifier instanceof Function ? bob.identifier() : matchId(platformObj, bob.identifier))) {
                continue;
            }
            // For things to succeed we need to resovle some specific properties in order first
            platform.name = result(bob, "name", [ platform ]);
            platform.version = result(bob, "version", [ platform ]);
            for (var prop in platform) {
                if (platform.hasOwnProperty(prop) && !platform[prop] && bob[prop]) {
                    platform[prop] = result(bob, prop, [ platform ]);
                }
            }
        }
        return platform;
    }
    // Support AMD loaders
    if (typeof require !== "undefined" && typeof define !== "undefined") {
        define(function() {
            return getPlatform;
        });
    } else if (typeof exports !== "undefined") {
        if (!module) module = {};
        exports = module.exports = getPlatform;
    } else {
        window.getPlatform = getPlatform;
    }
})();

(function() {
    // Determine platform/version
    var platform = getPlatform();
    // Given any version number with 1-3 potentially decimal separated digital (plus and before and after stuff)
    // this will try to make it valid semver (e.g. 17 -> 17.0.0, 1.2+build -> 1.2.0+build, also 17+ -> >=17).
    // For valid ranges and parsing see: https://github.com/isaacs/node-semver#ranges
    function convertToSemver(version) {
        var verparts = version.match(/([\D]*)([\d]+)(?:[.]([\d]+))?(?:[.]([\d]+))?(.*)/);
        if (verparts) {
            for (var i = 2; i < 5; i++) {
                if (typeof verparts[i] != "string") {
                    verparts[i] = "0";
                }
            }
        }
        var prefix = verparts[1];
        if (!prefix && verparts[5] == "+") {
            prefix = ">=";
            verparts[5] = "";
        }
        return prefix + verparts.slice(2, 5).join(".") + verparts[5];
    }
    var fasterJS = {
        getPlatform: function(alias) {
            alias = alias.toLowerCase();
            // Match the platform
            var platformFound = false;
            for (var pl in fasterJS.platformMatch) {
                if (alias == pl) {
                    platformFound = true;
                    break;
                }
                for (var k = 0; k < fasterJS.platformMatch[pl].length; k++) {
                    if (alias == fasterJS.platformMatch[pl][k]) {
                        platformFound = true;
                        alias = pl;
                        break;
                    }
                }
                if (platformFound) break;
            }
            // If we couldn't match the platform to a known one in the map, then throw an error. We shouldn't
            // be referencing platforms that we don't have mapped. It could be a typo.
            if (!platformFound) {
                throw new Error("'" + alias + "' is not a valid platform. Make sure you spelled it right. Names are NOT case sensitive.");
            }
            return alias;
        },
        select: function select(obj) {
            if (!obj.name) {
                throw new Error("Won't select from an object without a name - it is helpful for debugging");
            }
            if (!obj.map || !Object.keys(obj.map).length) {
                throw new Error("Failed to select a function for '" + obj.name + "': No map found");
            }
            // Always search the map in a predictable way
            var mapKeys = Object.keys(obj.map).sort();
            var fallback;
            for (var i = 0; i < mapKeys.length; i++) {
                var mapKey = mapKeys[i];
                if (obj[mapKey] instanceof Function) {
                    fallback = obj[mapKey];
                    // The map key's definition can be a string or an array of strings to match the platform against
                    var mapKeyDef = obj.map[mapKey];
                    if (!(mapKeyDef instanceof Array)) {
                        mapKeyDef = [ mapKeyDef ];
                    }
                    // Match the platform
                    for (var j = 0; j < mapKeyDef.length; j++) {
                        var defparts = mapKeyDef[j].split(/\s+(.+)?/);
                        var defPlatform = fasterJS.getPlatform(defparts[0]);
                        // If the defined platform isn't our platform then move on
                        if (defPlatform != platform.name) continue;
                        // If there is no version given in the definition then we match all versions, so we're done
                        if (!defparts[1]) {
                            return obj[mapKey];
                        }
                        // Every platform should have a version compare function defined in the platformComparators. We will
                        // operate under this assumption for now.
                        var versionCompareFunc = fasterJS.versionComparators[fasterJS.versionComparators[defPlatform] ? defPlatform : "default"];
                        if (versionCompareFunc(platform.version, defparts[1])) {
                            return obj[mapKey];
                        }
                    }
                }
            }
            if (!fallback) {
                throw new Error("Cannot select a function for '" + obj.name + "' from an object with no functions");
            }
            // If we've made it this far then no map definitions matched. Look for a default, otherwise pick the first we find.
            return obj.map["default"] ? obj[obj.map["default"]] : fallback;
        },
        // Abbreviations and aliases
        platformMatch: {
            node: [ "njs", "node.js" ],
            firefox: [ "ff" ],
            chrome: [ "chr", "chromium" ]
        },
        // Platform version comparator functions
        versionComparators: {
            "default": function(version, range) {
                // Convert version to semver
                var newVersion = convertToSemver(version);
                var rangeVers = range.split(" - ");
                for (var i = 0; i < rangeVers.length; i++) {
                    rangeVers[i] = convertToSemver(rangeVers[i]);
                }
                range = rangeVers.join(" - ");
                if (semver.valid(newVersion)) {
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
    } catch (err) {}
    (function() {
        // http://jsperf.com/count-elements-in-object
        var ObjectLength = {
            name: "Object Length",
            map: {
                "default": "length2",
                length1: "FF 17+",
                length2: "Chrome"
            },
            length1: function length(o) {
                if (!o) o = this;
                var l = 0;
                for (var k in o) {
                    if (o.hasOwnProperty(k)) {
                        l++;
                    }
                }
                return l;
            },
            length2: function length(o) {
                if (!o) o = this;
                return Object.keys(o).length;
            }
        };
        Object.length = Object.prototype.length = fasterJS.select(ObjectLength);
    })();
    // Support AMD loaders
    if (typeof require !== "undefined" && typeof define !== "undefined") {
        define(function() {
            return fasterJS;
        });
    } else if (typeof exports !== "undefined") {
        if (!module) module = {};
        exports = module.exports = fasterJS;
    } else {
        window.fasterJS = fasterJS;
    }
})();