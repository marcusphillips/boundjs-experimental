(function(){
  bound.extend({

    init: function(){
      extend(this, {
      });
    },

    prototypeProperties: {
      pub: function(){ throwError('publish is not written'); },
      sub: function(){ throwError('subscribe is not written'); },
    }
  });
}());
