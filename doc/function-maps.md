## Before you get started

You need to use the `faster.dev.js` file for developing function maps. It is important because this file sets a global variable `fjsDev` which changes the way caching works. By having this flag enabled when `fasterJS.select()` is called it caches extra information so it knows to refresh individual function map caches when you modify the code or the map. If this flag isn't set before Faster.js is loaded then the only time the cache is refreshed is when the version of Faster.js that is loaded changes.

## How to build a function map

The first thing you need to do is identify faster ways to perform a given function. Faster.js comes with a built-in benchmarking tool to help.

Next you need to create a file with a new function map. Here's an example (not the actual version of this):

```js
;(function() {
    var ObjectKeys = {
        name: 'Object Keys',
        map: {
            'default': 'keys1',
            keys1: [],
            keys2: ['Firefox 17+', 'Chrome']
        },

        keys1: function(o) {
            if(!o) o = this;

            var keys = [];
            for(var prop in o) {
                if(o.hasOwnProperty(prop)) {
                    keys.push(prop);
                }
            }

            return keys;
        },

        keys2: function() {
            ...
        }
    };

    Object.keys = Object.prototype.keys = fasterJS.select();
});
```

There's a lot going on here. First, note that it is very important that you include the name of every function you write (e.g. 'keys1', 'keys2') in the map, even if it is simply set to an empty array. Also note that 'default' can be a string referencing one of the functions that will be the default if the current platform didn't match any platforms in the map, or it can be a function that returns a string.

The name is also very important. You will just see an error if you don't provide a name. It is used when debugging to inform you which function map is failing, but it is also used as part of the key for the `localStorage` cache.