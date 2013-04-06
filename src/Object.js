;(function() {
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

  Object.length = Object.prototype.length = fasterJS.select(ObjectLength);
})();