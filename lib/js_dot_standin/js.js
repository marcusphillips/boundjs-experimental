(function(undefined){

  var global = this;

  var arraySlice = Array.prototype.slice;

  function js(input){ each(normalizers, function(normalizer){ normalizer(input); }); }

  // normalizers holds a list of changes to make to objects
  var normalizers = [];

  // dev helpers
  function noop(){}
  function conditionalDebug(){ if(js.debug){ debugger; } }
  function log(){
    if(typeof console !== 'undefined'){
      console.log.apply(console, arguments);
    }
  }

  function debugIf(condition){ if(condition){ debugger; } }
  function errorIf(condition, message){
    condition && error.apply(js, slice(arguments, 1));
  }
  function error(message, supplementalData){
    if(supplementalData && supplementalData !== true && console && console.log && console.log.apply){
      console.log('supplemental data for error to follow:', supplementalData);
    }
    if(arguments[arguments.length-1] === true){
      debugger;
    } else {
      logStackTrace(1);
      throw new Error(message);
    }
  }
  function logStackTrace(linesToSkip){
    linesToSkip = (linesToSkip || 0) + 1;
    try{
      throw new Error();
    }catch(error){
      error.stack && console.log('Stack trace: ', {stack: slice(error.stack.split('\n'), linesToSkip)});
    }
  }

  function catchIf(condition, block, onError, context){
    // todo: add finally support
    context || (context = this);
    if(!condition){ return block.call(context); }
    try           { return block.call(context); }
    catch (error) { return onError.call(context, error); }
  }

  // this utility puts a debugger statement into the write flow for any object's property.
  // helpful when you're trying to figure out how a property got set to an unexpected value
  // example: debugAssignment(user, 'name');
  function debugAssignment(object, key, condition, context){
    if(!object.__defineSetter__){ return; }
    // todo: make this capable of replacing old setter and getter, rather than overwriting
    object.__defineGetter__(key, function(     ){ return this['__debugging_'+key+'__']; });
    object.__defineSetter__(key, function(input){
      if(!condition || typeof condition === 'function' && condition.apply(context || object, input)){ debugger; }
      return (this['__debugging_'+key+'__'] = input);
    });
  }

  // language primitives

  function defaulted(value, alternative){ return typeof value === 'undefined' ? alternative : value; }
  function create(prototype, properties){
    extend(NoopConstructor, {prototype: prototype});
    return extend(new NoopConstructor(), properties || {});
  }
  function NoopConstructor(){}
  function isArray(input){ return Object.prototype.toString.call(input) === '[object Array]'; }
  function isObject(input){ return input && typeof input === 'object'; }
  function isFunction(input){ return typeof input === 'function'; }


  // regexen

  var matchers = {
    leadingOrTrailingSpace: /(^\s+)|(\s+$)/
  };


  // strings

  function trim(string){ return string.replace(matchers.leadingOrTrailingSpace, ''); }


  // function decorators

  function curry(fn){
    var curriedArgs = slice(arguments, 1);
    return function(){
      var inputArgs = slice(arguments);
      return fn.apply(this, map(curriedArgs, function(curriedArg){
        return curriedArg === undefined ? inputArgs.shift() : curriedArg;
      }).concat(inputArgs));
    };
  }

  function bind(fn, context){ return function(){ return fn.apply(context, arguments); }; }

  function memoizing(fn){
    var result, hasRun;
    return function(){
      if(hasRun){ return result; }
      result = fn.result = fn.apply(this, arguments);
      hasRun = fn.hasRun = true;
      return fn.result;
    };
  }

  /*
  // classes and constructors
  function makeMixable(init){
    var initializers = [];
    var mixable = extend(function(){
      var result = this;
      for(var i = 0; i < initializers.length; i++){
        result = initializers[i].apply(result, arguments);
        result === undefined && (result = this);
      }
    },{
      mix: function(){
        for(var i = 0; i < arguments.length; i++){
          var mixin = arguments[i];
          extend(mixable, mixin);
          extend(mixable.prototype, mixin.prototype);
          initializers.push(mixin);
        }
      }
    };
    mixable.mix(init);
    return mixable;
  }

  function makeMixin(){
    var args = slice(arguments);
    args[0] = function(){
      extend(this, mixin.prototype);
      initializer.call(target, args);
      return target;
    };
    var mixin = makeConstructor.apply({}, args);
    return mixin;
  }
  */

  var makeConstructor = function(init /*, instanceProperties1, [...instancePropertiesN] */){
    extend.apply({}, [init.prototype].concat(slice(arguments, 1)));
    return init;
  };

  // todo: change mixin usage to be .call()
  function makeMixin(init){
    var args = extend(slice(arguments), {
      '0': function(target){
        init.apply(extend(target, mixin.prototype), slice(arguments, 1));
        return target;
      }
    });
    var mixin = makeConstructor.apply({}, args);
    return mixin;
  }

  // properties and object capabilities

  // has is a safer version of the 'in' operator
  function has(object, key){ return !!object && !among(typeof object, ['string', 'number']) && (key in object); }
  function owns(object, key){ return !!object && !among(typeof object, ['string', 'number']) && object.hasOwnProperty(key); }

  function get(object, key){ return object[key]; }
  function set(object, key, val){
    if(typeof key === 'string'){
      object[key] = val;
    }else{
      var mappings = key;
      for(var name in mappings){
        mappings.hasOwnProperty(name) && set(object, name, mappings[name]);
      }
    }
    return object;
  }
  function prop(object, key, val){
    var operation = (arguments.length === 2 || typeof arguments[1] !== 'string') ? 'get' : 'set';
    return object && js[operation].apply(this, arguments);
  }

  function run(object, methodName, args, context){ return exec(object[methodName], args, context || object); }
  function exec(callable, args, context){ return callable.apply(context || global, args || []); }
  function del(object, keys){
    each(isArray(keys) ? keys : [keys], function(key){ delete object[key]; });
    return object;
  }


  // objects

  function extend(target /*, source1, [... sourceN]*/){
    for(var whichArg = 1; whichArg < arguments.length; whichArg++){
      var source = arguments[whichArg];
      for(var key in source){
        target[key] = source[key];
      }
    }
    return target;
  }

  function copy(seed){
    return extend((
      isArray(seed) ? [] :
      isObject(seed) ? {} :
      isFunction(seed) ? function(){ return seed.apply(this, arguments); } :
      error('invalid type for copy()')
    ), seed);
  }


  // arrays

  function last(array){ return array[array.length-1]; }
  function slice(collection){ return arraySlice.call(collection, arraySlice.call(arguments, 1)); }
  function concatArrays(arrays){ return reduce(arrays, [], function(memo, array){ return memo.concat(array); }); }
  function toArray(arrayLikeObject){ return reduce(arrayLikeObject, [], function(memo, item){ memo.push(item); }); }
  function makeArrayLike(target){
    return reduce('concat join pop push reverse shift slice sort splice unshift'.split(' '), target, function(memo, methodName){
      target[methodName] = function(){ return Array.prototype[methodName].apply(this, arguments); };
    });
  }


  // collections

  function clear(target){
    return each(target, function(item, key){
      delete target[key];
    });
  }

  function hasKeys(object){
    for(var key in object){ return true; }
    return false;
  }

  function keys(object){
    return toArray(map(object, function(value, key){ return key; }));
  }

  function among(needle, haystack){
    return haystack.indexOf ? haystack.indexOf(needle) !== -1 : reduce(haystack, false, function(memo, item){
      return memo || item === needle;
    });
  }


  // iteration

  // todo: add a hasOwnProperty skip test?
  var _iterationSkipTests = [];

  function skipIteration(item, key, collection){
    if(item && item._boundFlag){ return true; }
    // can't use higher-level iteration functions here, or we'll infinitely recurse
    for(var i = 0; i < _iterationSkipTests.length; i++){
      if(_iterationSkipTests[i].apply(collection, arguments)){ return true; }
    }
    return false;
  }

  function each(collection, block, context){
    errorIf(!collection, 'tried to iterate over a falsey value');
    return (('length' in collection) ? inOrder : allKeys)(collection, block, context);
  }

  function inOrder(collection, block, context){
    block = _normalizeIterationBlock(block);
    for(var which = 0; which < collection.length; which++){
      if(skipIteration(collection, collection[which], which)){ continue; }
      block.call(context || collection, collection[which], which);
    }
    return collection;
  }

  function allKeys(collection, block, context){
    block = _normalizeIterationBlock(block);
    for(var key in collection){
      if(skipIteration(collection, collection[key], key)){ continue; }
      block.call(context || collection, collection[key], key);
    }
    return collection;
  }

  function reduce(collection, memo, block, context){
    block = _normalizeIterationBlock(block);
    each(collection, function(item, which){
      var result = block.call(context || collection, memo, item, which);
      result !== undefined && (memo = result);
    });
    return memo;
  }

  function map(collection, block, context){
    block = _normalizeIterationBlock(block);
    var result = ('length' in collection) ? [] : {};
    each(collection, function(item, which){
      result[which] = block.call(context || collection, item, which);
    }, context);
    return result;
  }

  function exhaust(source, block, context){
    var repeatLimit = 100000;
    block = _normalizeIterationBlock(block);
    while(hasKeys(source)){
      errorIf(!(--repeatLimit), 'could not exhaust source object in '+ repeatLimit +' iterations', {source: this._directives});
      each(source, function(item, key){
        if(source.hasOwnProperty(key)){
          block.apply(this, arguments);
          delete source[key];
        }
      }, context);
    }
  }

  function filter(array, block, context){
    //todo bug: block will never default to reject falseys
    block = _normalizeIterationBlock(block);
    return reduce(array, [], function(memo, item, index){
      return (block || _rejectFalseys).call(context || array, item, index) ? memo.concat([item]) : memo;
    });
  }

  function _rejectFalseys(item){ return !!item; }

  // if the input is a string, make a generator function that returns the property at that key
  // if the input is an array, use the first element as a method name, and use the second argument as an arguments array
  function _normalizeIterationBlock(input){
    return (
      isArray(input) ? function(item){ return item[input[0]].apply(item, input[1] || []); } :
      typeof blockDefinition === 'string' ? function(item){ return item[input]; } :
      input
    );
  }

  //todo optimization: make iteration helpers use these iterators instead of building new functions every time
  function iterators(name, builder, executer){
    iterators[name] = function(){
      return extend({execute: executer}, builder());
    };
  };

  iterators('functionCaller',
    function(block, context){
      return {
        block: block,
        context: context || {}
      };
    },
    function(){ return this.block.apply(this.context, arguments); }
  );

  iterators('propertyGetter',
    function(key){ return {key: key}; },
    function(item){ return item[this.key]; }
  );

  iterators('methodCaller',
    function(key, args, context){
      return {
        key: key,
        args: args,
        context: context
      };
    },
    function(item){
      return item[this.key].apply(this.context || item, this.args);
    }
  );


  // extras

  function unique(namespace){
    namespace || (namespace = '');
    return namespace + (unique.used[namespace] = (unique.used[namespace] || 0) + 1);
  }

  extend(unique, {
    used: {},
    reset: function(namespace){ delete unique.used[namespace]; }
  });


  // classes

  var Set = makeConstructor(function(getKey){
    getKey && (this._getKey = getKey);
    extend(this, { _items: {} });
  },{
    _getKey: function(){ error('You must define a getKey operation'); }, // todo: provide a default getKey function
    add: function(item){ return this._items[this._getKey(item)] = item; },
    remove: function(item){ delete this._items[this._getKey(item)]; },
    contains: function(item){ return this._getKey(item) in this._items; },
    each: function(block, context){ return each(this._items, block, context); },
    exhaust: function(block, context){ return exhaust(this._items, block, context); }
  });

  var mixLinkedList = makeMixin(function(){
    extend(this, {
      first: null,
      last: null
    });
  }, {
    push: function(value){
      var link = new Link(this, value);
      return this.last ? this.last.append(link) : (this.last = this.first = link);
    },
    each: function(block, context){ this.first.eachSubsequent(block, context); }
  });

  var Link = makeConstructor(function(list, value){
    this.list = list;
    this.value = value;
    this.prev = this.next = null;
  },{
    setPrev: function(link){ return this.prev = link; },
    setNext: function(link){ return this.next = link; },
    append: function(link){
      this.list.last === this && (this.list.last = link);
      link.setPrev(this);
      return this.setNext(link);
    },
    eachSubsequent: function(block, context){
      block.call(context || this.list, this.value);
      this.next && this.next.eachSubsequent(block, context);
    }
  });









  // todo cleanup: add getter/setter checking for supporting browsers, and disallow direct access
  var strictlyAccessed = makeMixin(function(/*allowedKey1, ...allowedKeyN*/){
    this._allowKeys(slice(arguments));
  },{
    _allowKeys: function(){
      for(var i = 0; i < arguments.length; i++){
        key = arguments[i];
        if(isArray(key)){
          var keys = key;
          for(var i = 0; i < keys.length; i++){
            this._allowKeys(keys[i]);
          }
        }else if(isObject(key)){
          var mappings = key;
          for(var mappingKey in mappings){
            this._allowKeys(mappingKey).set(mappingKey, mappings[mappingKey]);
          }
        }else{
          this['_allowedKeys_'+key] = true;
          this['_isSet_'+key] = key in this;
          key in this || (this[key] = undefined);
        }
      }
      return this;
    },
    _attemptAccess: function(key){
      errorIf(!this['_allowedKeys_'+key], '"'+key+'" is not an allowed key');
    },

    _addStrictProperty: function(key, options){
      options.memoizing === false || (options.memoizing = true);
      var storageKey = '_' + key;
      this._allowKeys(storageKey);
      this['set'+storageKey] = function(value){
        options.onAccess && options.onAccess.call(this);
        options.onSet && options.onSet.call(this);
        return this.set(storageKey, value);
      };
      var getter = function(){
        options.onAccess && options.onAccess.call(this);
        options.onGet && options.onGet.call(this);
        return !this.isSet(storageKey) && options.init ? options.init.call(this) : this.get(storageKey);
      };
      this['get'+storageKey] = options.memoizing ? strictlyAccessed.memoizingMethod(storageKey, getter) : getter;
      return this;
    },

    get: function(key){
      this._attemptAccess(key);
      errorIf(!this.isSet(key), key+' has not been set');
      return this[key];
    },
    set: function(key, value){
      if(typeof key !== 'string'){
        var mappings = key;
        for(var name in mappings){
          mappings.hasOwnProperty(name) && this.set(name, mappings[name]);
        }
        return this;
      }
      this._attemptAccess(key);
      this['_isSet_'+key] = true;
      return (this[key] = value);
    },
    isSet: function(key, force){
      force || this._attemptAccess(key);
      return this['_isSet_'+key];
    }
  });

  strictlyAccessed.memoizingMethod = function(key, method){
    return function(){
      this._allowKeys(key);
      return this.isSet(key) ? this.get(key) : this.set(key, method.apply(this, arguments));
    };
  };



  // add public functions to interface
  extend(js, {
    allKeys: allKeys,
    among: among,
    bind: bind,
    catchIf: catchIf,
    clear: clear,
    concatArrays: concatArrays,
    conditionalDebug: conditionalDebug,
    copy: copy,
    create: create,
    curry: curry,
    debugAssignment: debugAssignment,
    debugIf: debugIf,
    defaulted: defaulted,
    del: del,
    each: each,
    error: error,
    errorIf: errorIf,
    exec: exec,
    exhaust: exhaust,
    extend: extend,
    filter: filter,
    get: get,
    global: global,
    has: has,
    hasKeys: hasKeys,
    inOrder: inOrder,
    isArray: isArray,
    keys: keys,
    last: last,
    log: log,
    makeArrayLike: makeArrayLike,
    makeConstructor: makeConstructor,
    makeMixin: makeMixin,
    map: map,
    memoizing: memoizing,
    mixLinkedList: mixLinkedList,
    noop: noop,
    owns: owns,
    prop: prop,
    reduce: reduce,
    run: run,
    Set: Set,
    set: set,
    strictlyAccessed: strictlyAccessed,
    slice: slice,
    toArray: toArray,
    trim: trim,
    unique: unique
  });

  each({
    prop: 'accessor',
    get:  'getter',
    set:  'setter',
    run:  'runner',
    exec: 'executer',
    del:  'deleter'
  }, function(generatorName, methodName){
    js[generatorName] = function(object){
      return curry(js[methodName], object);
    };
  });


  window.js = window.js || js;

}());
