(function(){

  // import js.* and other utilities into this scope
  var curry = js.curry, each = js.each, extend = js.extend, log = js.log, map = js.map, noop = js.noop, prop = js.prop, reduce = js.reduce, slice = js.slice, throwError = js.error, throwErrorIf = js.errorIf, unique = js.unique;

  var extractClosure = {};

  bound.extend({

    init: function(){
      extend(this, {
        _dependants: {},
        calculators: {},
        dependers: {}
      });
    },

    prototypeProperties: {
      method: function(key, fn){
        //note: methods in javascript are designed to be reused generically across objects (due to the keyword "this"), so our recalculation behavior tries to model that reusability
        //asdf trigger property change dependencies
        this.object[key] = function(key){
          if(key === extractClosure){ return fn; }
          return fn.apply(bound(this)._makeDepender(), arguments);
        }
        this.object[key]._isDependableMethod = true;
      },

      dependantMethodCall: function(depender, key, args){
        if(this.object[key]._isDependableMethod){
          return this.object[key](extractClosure).apply(depender, args);
        }else{
          return this.object[key].apply(this.object, args);
        }
      },

      property: function(key, calculator){
        //asdf make propertyRecalculation behavior contagious to objects that prototype the current object
        //asdf how does prototype fallthrough behave?
        //asdf when a property lookup happens, the leaf object that the query is happening in should register dependant interest in the prototype object's property of the same name
        this.calculators[key] = calculator;
        this.calculate(key);
      },
      calculate: function(key){
        //asdf expire property deps
        var oldValue = this.object[key];
        var newValue = this.object[key] = this.calculators[key].call(this._makeDepender(key));
        this.changed(key, oldValue);
        return newValue;
      },

      changed: function(key, oldValue){
        var dependants = this._dependants[key] || [];
        this._dependants[key] = [];
        changedArguments = arguments;
        each(dependants, function(response){
          // asdf check if response is a one-off or persistent dependency, put it back in dependencies if so
          changedArguments.length ? response(this.object[key], oldValue) : response(this.object[key]);
        }, this);
      },

      _makeDepender: function(dependingKey){
        var proxy = this;
        var isActive = !!arguments.length;
        // asdf also need to pass a procedure identity around to prevent repeats
        var invalidator = function(){
          proxy.dependers[dependingKey] === depender && proxy.calculate(dependingKey);
        };
        var depender = function(){
          if(!arguments.length){ return proxy; }
          var args = slice(arguments);

          var context = typeof arguments[0] === 'string' ? proxy.object : args.shift();
          var dependedKey = args.shift();
          var value = context[dependedKey];
          isActive && bound(context).addDependant(dependedKey, invalidator);
          return args.length ? bound(context).dependantMethodCall(depender, dependedKey, args.shift()) : value;
        };
        isActive && (this.dependers[dependingKey] = depender);
        return depender;
      },

      addDependant: function(key, response){
        this._dependants[key] || (this._dependants[key] = []);
        this._dependants[key].push(response);
      }
    }
  });

}());
