;(function() {
  var ObjectKeys = {
    name: 'Object Keys',

    map: {
      'default': function() {
        if(Object.keys) return 'keys1';
        else return 'keys2';
      },
      keys1: [],
      keys2: []
    },

    keys1: function(o) {
      if(!o) o = this;

      return Object.keys(o);
    },

    keys2: function(obj) {
      if(!obj) obj = this;

      var keys = [];
      for(var k in obj) {
        if(obj.hasOwnProperty(k)) {
          keys.push(k);
        }
      }

      return keys;
    }
  };

  var origKeys = Object.keys;
  Object.keys = Object.prototype.keys = fasterJS.select(ObjectKeys);

  // Use the original keys function if that's what was selected to avoid the extra wrapping on the static version of the call
  if(origKeys && Object.keys == ObjectKeys.keys1) Object.keys = origKeys;



  // http://jsperf.com/count-elements-in-object
  var ObjectLength = {
    name: 'Object Length',

    map: {
      'default': 'length2',
      length1: 'FF 17+',
      length2: 'Chrome'
    },

    length1: function length(o) {
      if(!o) o = this;

      var l = 0;
      for(var k in o) {
        if(o.hasOwnProperty(k)) {
          l++;
        }
      }

      return l;
    },

    length2: function length(o) {
      if(!o) o = this;

      return Object.keys(o).length;
    }
  };

  // Benchmark to test caching
  /*var start = (new Date()).getTime();
  for(var i = 0; i < 100000; i++) {
    fasterJS.select(ObjectLength);
  }
  console.log((new Date()).getTime() - start);*/

  Object.length = Object.prototype.length = fasterJS.select(ObjectLength);
})();