/*!
 * React for JavaScript - an easy-rerender template language
 * Version 1.3.1, http://github.com/marcusphillips/react
 *
 * Copyright 2010, Marcus Phillips
 * Dual licensed under the MIT or GPL Version 2 licenses.
 */

(function(undefined) {

  /*
   * Library-wide helpers
   */

  var global = this;
  var debugging = false;

  // import js.* and other utilities into this scope
  var among = js.among,
      bind = js.bind,
      catchIf = js.catchIf,
      clear = js.clear,
      concatArrays = js.concatArrays,
      create = js.create,
      curry = js.curry,
      debugIf = js.debugIf,
      each = js.each,
      exhaust = js.exhaust,
      extend = js.extend,
      filter = js.filter,
      has = js.has,
      hasKeys = js.hasKeys,
      inOrder = js.inOrder,
      isArray = js.isArray,
      keysFor = js.keys,
      log = js.log,
      makeConstructor = js.makeConstructor,
      makeMixin = js.makeMixin,
      map = js.map,
      memoizingMethod = js.strictlyAccessed.memoizingMethod,
      mixLinkedList = js.mixLinkedList,
      noop = js.noop,
      reduce = js.reduce,
      Set = js.Set,
      slice = js.slice,
      strictlyAccessed = js.strictlyAccessed,
      throwError = js.error,
      throwErrorIf = js.errorIf,
      toArray = js.toArray,
      trim = js.trim;

  var boundProxy = bound.proxy;

  var matchers = {
    directiveDelimiter: /\s*,\s*/,
    space: /\s+/,
    negation: /!\s*/,
    isString: /(^'.*'$)|(^".*"$)/,
    isNumber: /^\d+$/
  };

  var getKey = function(item){
    return (
      item.nodeType === 1 || item instanceof jQuery ? getNodeKey(item) :
      item.isSet('_isHierarchical', true) ? item.get('key') :
      item.isSet('_isVisitable', true) ? item.get('key') :
      throwError('bad input to getKey()')
    );
  };

  // returns a unique, consistent key for every node
  var getNodeKey = function(node){ return boundProxy(node instanceof jQuery ? node[0] : node).key; };

  // Fallthroughs provide a mechanism for binding one key in a scope to the value at another key
  var Fallthrough = function(key){ this.key = key; };


  /*
   * Library interface
   */

  var react = {

    debug: function(){ debugging = true; },
    name: function(){ console && console.warn('react.name() is deprecated'); },
    reset: function(){ console && console.warn('react.reset() is deprecated'); },

    // convenience method for setting object values and automatically calling changed on them
    set: function(object, key, value){
      object[key] = value;
      this.changed(object, key);
    },

    // allows user to notify react that an object's property has changed, so the relevant nodes may be updated
    changed: function(){
      var operation = new Operation();
      operation.changed.apply(operation, arguments).run();
    },

    update: function(input){
      var node = input;
      if(node instanceof jQuery){
        throwErrorIf(node.length !== 1, 'you cannot pass a jquery object containing many nodes to react.update()');
        node = node[0];
      }
      throwErrorIf(!node, 'you did not pass a valid node to react.update()');
      var operation = new Operation();
      operation(node).planToUpdateBranch();
      operation.run();
      return input;
    },

    anchor: function(node){
      // todo: clean up any links elsewhere (like listeners) that are left by potential existing anchors
      var $$node = $$(node).extend({anchors: slice(arguments, 1)});
      new Operation().planToUpdate($$node.getBoundAttribute('anchored').add([])).run();
      return node;
    },

    helpers: extend(function(focus, deeply){
      extend(focus, react.helpers);
      deeply && each(focus, function(item, key){
        key !== 'set' && item && typeof item === 'object' && !item.set && react.helpers(item, deeply);
      });
      return focus;
    },{

      anchor: function(node){
        jQuery(node).anchor(this);
        return this;
      },

      set: function(key, value){
        var newValues = {};
        typeof key !== 'string' ? newValues = key : newValues[key] = value;
        react.changed(extend(this, newValues), keysFor(newValues));
      },

      del: function(keys){
        each(isArray(keys) ? keys : [keys], function(key){
          delete this[key];
        }, this);
        react.changed(this, keys);
      },

      changed: function(){ react.changed(this); }

    }),

    integrate: {

      Backbone: function(){
        var changeMatcher = /^change:/;
        Backbone.ReactiveModel = Backbone.Model.extend({
          constructor: function(options){
            Backbone.Model.apply(this, arguments);
            this.JSON = this.toJSON();
            this.bind('all', function(eventName){
              if(eventName.match(changeMatcher)){
                var key = eventName.slice(7);
                this.JSON[key] = this.get(key);
                console.log(key, this.JSON);
                react.changed(this.JSON, key);
              }
            }, this);
          }
        });
      },

      jQuery: function(){
        var singularize = function(method){
          return function(){
            throwErrorIf(this.length !== 1, 'react\'s jQuery helpers can only be run on jQuery objects containing a single member');
            return method.apply(this, arguments);
          };
        };

        jQuery.fn.extend(map({

          update: function(){ return react.update(this); },

          anchor: function(){
            throwErrorIf(!arguments.length && this.anchors().length !== 1, '.anchor() can only be called on nodes with a single anchored object');
            return arguments.length ? react.anchor.apply(react, [this].concat(slice(arguments))) : this.anchors()[0];
          },

          anchors: function(){ return $$(this).anchors; },

                        //todo cleanup: move this to an external file for reference
/*
          boundChildren: function(directiveString){
            return this.find(':not(.'+this.boundKey()+' [react] [react])[react]').filter(function(){
               return !isAnchored(somehow...); // this might also be doable in a not selector
            }).boundFilter(directiveString);

            manual implementation
            var $ceiling = jQuery(this);
            var $boundChildren = $ceiling.find('[react]').filter(function(which, item){
              var $ancestor = jQuery(item);
              while(($ancestor = $ancestor.parent()).length){
                if($ancestor[0] === $ceiling[0]){ return true; }
                else if($ancestor.is('[react]') || $ancestor.isAnchored()){ return false; }
              }
            });
            return $boundChildren.boundFilter(directiveString);
          },

          boundFilter: function(directiveString){
            var i;
            if(!directiveString){ return this; }
            var directive = new DirectiveVisit(directiveString);
            return this.filter(function(item){
              var directives = jQuery(item).boundDirectives();
              for(i = 0; i < directives.length; i+=1){
                if(directive.inputs ? directive.matches(each) : directive.command === each.command){ return true; }
              }
            });
          },
*/

          items: function(){ return this.children().slice(1); },
          item: function(which){ return this.items().eq(which); },
          itemTemplate: function(){ return this.children().eq(0); }

        }, singularize));
      }
    }
  };




  /*
   * Scope chains
   */

  // Scope chains are used to model namespace lookup behavior in templates
  // all scope chains should be built by calling emptyScopeChain.extend()

  var ScopeChain = function(type, previousLink, additionalScope, options){
    options = options || {};

    extend(this, {
      previous: previousLink,
      scope: additionalScope,
      type: type,
      key: options.key,
      prefix: options.prefix || ''
      // todo this shouldn't need a prefix
    });
  };

  extend(ScopeChain.prototype, {

    contains: function(scope){
      return this.scope === scope || (this.previous && this.previous.contains(scope));
    },
    extend: function(type, additionalScope, options){
      return new ScopeChain(type, this, additionalScope, options);
    },
    extendWithMany: function(type, scopes, options){
      return reduce(scopes || [], this, function(memo, scope){
        memo.extend(type, scope, options);
      });
    },

    lookup: function(){ return this.resolve.apply(this, arguments).value; },
    resolve: function(pathString, options){ return new Resolution(this, pathString, options); },

    // provides a description of the scope chain in array format, optimized for viewing in the console
    describe: function(){
      return [
        ['scope: ', this.scope, ', type of scope shift: ' + this.type + (this.prefix ? ' (prefix: '+this.prefix+')': '')]
      ].concat(this.previous ? this.previous.describe() : []);
    }

  });

  var emptyScopeChain = new ScopeChain('empty');
  // all lookups fail in the empty scope chain
  emptyScopeChain.resolve = function(){ return {failed: true, potentialObservers: []}; };




  /*
   * Resolution
   */

  // provides the value at a given path key, by looking through the scope chain from a given link upwards
  var Resolution = function(scopeChain, pathString, options){
    pathString = isArray(pathString) ? pathString.join('.') : pathString.toString();
    extend(this, {
      lowestScopeChain: scopeChain,
      potentialObservers: [],
      options: options || {}
    });

    var negate = pathString[0] === '!';
    negate && (pathString = pathString.slice(1));

    if(matchers.isString.test(pathString)){
      return extend(this, {value: pathString.slice(1, pathString.length-1)});
    }

    var path = pathString.split('.');
    this.resolveName(path.shift(), path);
    typeof this.value === 'function' && (this.value = this.value.call(this.lowestScopeChain.scope));
    negate && (this.value = !this.value);
  };

  extend(Resolution.prototype, {

    resolveName: function(key, path){
      var originalKey = key;
      for(var value; value instanceof Fallthrough; value = this.lowestScopeChain.scope[key]){
        // a Fallthrough object remaps a key to a different key in the previous scope (acts as binding)
        this.lowestScopeChain = this.lowestScopeChain.previous;
        key = value.key;
      }

      //todo cleanup: Observer() should not auto write, make them write if they are needed. thus we don't need potential observers, just observers that sometimes get written to the object
      this.potentialObservers.push({scopeChain: this.lowestScopeChain, key: key});

      this.didMatchFocus || (this.didMatchFocus = this.options.checkFocus === this.lowestScopeChain.scope);

      // recurse onto the previous scopeChain if the lookup fails at this level
      this.extend(has(this.lowestScopeChain.scope, key) ? {value: value} : this.lowestScopeChain.previous.resolve(key, this.options));

      // for dot access
      path.length && this.value && this.extend(emptyScopeChain.extend('dotAccess', this.value, {
        prefix: this.lowestScopeChain.prefix + originalKey + '.'
      }).resolve(path, this.options));
    },

    extend: function(moreDetails){
      moreDetails || (moreDetails = {});
      return extend(this, moreDetails, {
        //todo cleanup: why this "|| []" stuff? test if its really necessary
        potentialObservers: (this.potentialObservers || []).concat(moreDetails.potentialObservers || []),
        didMatchFocus: this.didMatchFocus || moreDetails.didMatchFocus
      });
    }

  });






  // todo optimization: optimize this hotwiring function out. currently we visit all members or successors of certain types
  var visitItem = function(item){ item.visit(); };

  /*
   * Operation
   */

  // An operation provides a shared context where complex interactions may rely upon shared state

  var Operation = function(){
    var operation = function(item){
      if(item === null){ return null; }
      if(item.nodeType === 1 || item instanceof jQuery){ item = $$(item); }
      return operation._opObjects[getKey(item)] = operation._opObjects[getKey(item)] || new (
        Node.is(item) ? OpNode :
        BoundAttribute.is(item) ? OpBoundAttribute :
        Directive.is(item) ? OpDirective :
        throwError('unrecognized input to operation()')
      )(item, operation);
    };
    extend(composableVisitable(operation), Operation.prototype)._allowKeys({
      ensuredVisits: [],
      _opObservers: [],
      _opObjects: {}
    });
    return operation;
  };

  extend(Operation.prototype, {

    _isOperation: true,

    //todo cleanup: make a method of operation that returns the cached version of a op object, make op constructors return this if available

    changed: function(object, keys){
      keys = (
        isArray(keys) ? keys :
        keys !== undefined ? [keys] :
        keysFor(object).concat(has(object, 'length') && !object.propertyIsEnumerable('length') ? ['length'] : [])
      );
      each(keys, this._registerDirtyObserversForKey, {context: this, object: object});
      return this;
    },

    planToUpdate: function(item){
      this(item).planToUpdate();
      return this;
    },

    _registerDirtyObserversForKey: function(key){
      var observersToProperty = toArray(boundProxy(this.object).observersByProperty[key] || {});
      each(observersByProperty, this._registerDirtyObserver, this.context);
    },

    _registerDirtyObserver: function(observer){
      //todo cleanup: change this to this(observer).dirty();
      this(observer.directive).dirtyObserver(observer);
    },

    run: function(){ return this.visit(); },

    planToVisitPrerequisites: function(){ return this; },
    visitSuccessors: function(){ return this; },
    addMember: function(item){ this.ensuredVisits.push(item); },

    eachMember: function(block, context){ return each(this.ensuredVisits, block, context); }

  });
  // todo optimizaion: if we .visit() requires traversing all children, list updates could take exponential in certain poor use patterns








  /*
   * $$ (subclass of jQuery)
   */

  // Overriding jQuery to provide supplemental functionality to DOM node wrappers
  // Within the scope of the Operation constructor, all calls to $$() return a customized jQuery object. For access to the original, use jQuery()
  var $$ = function(node){
    node && has(node, 'length') && (node = node[0]);
    throwErrorIf(!node || node.nodeType !== 1, 'node arg must be a single DOM node');
    var proxy = boundProxy(node);
    var $$node = proxy.meta('$$node');
    return $$node || proxy.meta('$$node', new Node(node)).meta('$$node');
  };

  var Node = function(node){
    jQuery.prototype.init.call(this, node);
    hierarchical(this)._allowKeys({
      node: node,
      key: getNodeKey(node),
      anchors: []
    });
    // todo cleanup: move this logic into getBoundAttributes()
    each(this.getDirectiveArrays(), function(tokens){
      this.getBoundAttribute(tokens[0]).makeAndPush(tokens.slice(1));
    }, this);
  };

  // note: a correct mapping of the .constructor property to $$ breaks jquery, since it calls new this.constructor() with no arguments
  Node.prototype = create(jQuery.prototype, {
    _is$$Node: true,

    getPredecessor: function(){ return this.get('anchors').length ? null : this.wrappedParent(); },
    wrappedParent: function(){
      var parent = this.parent()[0];
      return among(parent, [undefined, document]) ? null : $$(parent);
    },

    getBoundAttribute: function(commandName){
      var key = '_boundAttribute_' + commandName;
      //todo cleanup: set these allowed keys in constructor by iterating over precedence
      this._allowKeys(key);
      return this.isSet(key) ? this.get(key) : this.set(key, new BoundAttribute(this, commandName));
    },

    getStorage: function(key){
      this.node._boundStorage || (this.node._boundStorage = {});
      return this.node._boundStorage[key];
    },
    setStorage: function(key, value){
      var mappings = {};
      key && typeof key === 'object' ? mappings = key : mappings[key] = value;
      this.node._boundStorage || (this.node._boundStorage = {});
      extend(this.node._boundStorage, mappings);
      return this;
    },

    setDirectivesString: function(value){
      // if the value is being set to empty, and the node already has an inert directives string (empty string or no attribute at all), then don't alter its state
      // modifying all nodes that lacked attributes to have react="" would result in over-matching of the nodes on subsequent DOM queries
      return (value || this.attr('react')) ? this.attr('react', value) : this;
    },
    getDirectivesString: function(){ return this.attr('react') || ''; },
    getDirectiveStrings: function(){
      return map(this.getDirectivesString().split(matchers.directiveDelimiter), function(string){
        return trim(string).replace(matchers.negation, '!').replace(matchers.space, ' ');
      });
    },
    getDirectiveArrays: function(){
      return reduce(this.getDirectiveStrings(), [], function(memo, string){
        string && memo.push(trim(string).split(matchers.space));
      });
    },

    isLoopTemplate: function(){
      return this.hasClass('reactItemTemplate');
    },

    eachMember: function(block, context){
      each(orderedCommandNames, function(commandName){
        block.call(context || this, this.getBoundAttribute(commandName));
      }, this);
    },

    eachSuccessor: function(block, context){
      var that = this;
      this.children().each(function(which, child){
        block.call(context || that, $$(child));
      });
    }


  });

  Node.is = function(thing){ return thing._is$$Node; };

  var getContaining$$Node = memoizingMethod('_$$Node', function(){
    return Node.is(this.getContainer()) ? this.getContainer() : this.getContainer().get$$Node();
  });










  /*
   * OpNode (metadata about nodes, for operations)
   */
  var OpNode = function($$node, operation){
    composableVisitable(this, $$node, operation)._allowKeys(
      '_isSearched',
      {
        _container: operation,
        key: $$node.get('key')
      }
    );
  };
  extend(OpNode.prototype,{

    _isOpNode: true,

    getOpBoundAttribute: function(commandName){
      return this._operation(this.getTarget().getBoundAttribute(commandName));
    },

    // todo cleanup: don't allow access to non op objects?
    get$$Node: function(){ return this.getTarget(); },

    getReactNodes: function(){ return [this].concat(this.getReactDescendants()); },

    // note: getReactDescendants() only returns descendant nodes that have a 'react' attribute on them. any other nodes of interest to react (such as item templates that lack a 'react' attr) will not be included
    // todo: optimize selection criteria
    // return map(toArray(this.find('[react]:not([:data-anchored-to]):not([:data-anchored-to] *)')), function(node){
    getReactDescendants: function(){
      return map(this.get$$Node().find('[react]'), this._operation);
    },

    isSearched: function(){ return this.get('_isSearched'); },
    setAsSearched: function(){ return this.set({_isSearched: true}); },

    planToUpdateAllSuccessors: function(){ return this.planToUpdateSuccessors().planToVisitAllDescendants(); },
    planToVisitAllDescendants: function(){
      // when considering updating the after directive of all descendant react nodes, we need to include the root as well, since we might be calling this on another earlier directive of that node
      this.isSearched() || each(this.getReactNodes(), this.markItemAsSearchedAndPlanToVisit, this);
      return this;
    },
    // since the querySelectorAll operation finds ALL relevant descendants, we will not need to run it again on any of the children returned by the operation
    markItemAsSearchedAndPlanToVisit: function(item){ item.setAsSearched().planToVisit(); },

    //todo optimization: only need to visit all members sometimes
    //todo optimization: remove all function generating patterns
    process: function(){
      this.get$$Node().isLoopTemplate() ? this.set_processing_pruned(true) : this.visitMembers();
    },

    considerVisitingMember: visitItem

  });

  var getContainingOpNode = memoizingMethod('_opNode', function(){
    return OpNode.is(this.getContainer()) ? this.getContainer() : this.getContainer().getOpNode();
  });





  /*
   * BoundAttribute
   */

  var BoundAttribute = makeConstructor(function($$node, commandName){
    mixLinkedList(hierarchical(this, $$node))._allowKeys({
      commandName: commandName,
      key: undefined
    });
    //todo cleanup: make all keys inputs to the heirichal() mixin
    this.set('key', this.getContainer().get('key') + ' ' + commandName);
  },{

    _isBoundAttribute: true,

    get$$Node: getContaining$$Node,

    add: function(inputs){ return this.makeAndPush(inputs).write(); },

    makeAndPush: function(inputs){
      var directive = new Directive(this, this.get('commandName'), inputs);
      return (directive.link = this.push(directive)).value;
    },

    _getPrecedence: function(){ return commandPrecedence[this.get('commandName')]; },
    _getPreceedingCommandName: function(){ return commandPrecedence[this._getPrecedence() - 1] || null; },
    _getFollowingCommandName: function(){ return commandPrecedence[this._getPrecedence() + 1] || null; },
    getPredecessor: memoizingMethod('_predecessor', function(){
      return this._getPrecedence() && this.get$$Node().getBoundAttribute(this._getPreceedingCommandName());
    }),
    getSuccessor: memoizingMethod('_successor', function(){
      return this._getFollowingCommandName() && this.get$$Node().getBoundAttribute(this._getFollowingCommandName());
    }),

    eachMember: function(block, context){ return this.each(block, context); },
    eachSuccessor: function(block, context){
      this._getFollowingCommandName() && block.call(context || this, this._getFollowingBoundAttribute());
    },

    write: function(){
      this.get$$Node().attr('data-'+this.get('commandName'), this.toString());
      return this;
    },

    toString: function(){
      var result = '';
      this.each(function(directive){
        result += directive.toString();
      });
      return result;
    }

  });

  BoundAttribute.is = function(thing){ return thing._isBoundAttribute; };

  var getContainingBoundAttribute = memoizingMethod('_boundAttribute', function(){
    return BoundAttribute.is(this.getContainer()) ? this.getContainer() : this.getContainer().getBoundAttribute();
  });




  var OpBoundAttribute = makeConstructor(function(boundAttribute, operation){
    composableVisitable(this, boundAttribute, operation)._allowKeys({
      key: boundAttribute.get('key')
    });
  },{

    _isOpBoundAttribute: true,

    getOpNode: getContainingOpNode,

    considerVisitingMember: visitItem,
    considerVisitingSuccessor: visitItem

  });

  var getContainingOpBoundAttribute = memoizingMethod('_opBoundAttribute', function(){
    return OpBoundAttribute.is(this.getContainer()) ? this.getContainer() : this.getContainer().getOpBoundAttribute();
  });








  var hierarchical = makeMixin(function(container){
    strictlyAccessed(this)._allowKeys({
      _isHierarchical: true,
      _container: container
    });
  },{
    getContainer: function(){ return this.get('_container'); }
  });








  /*
   * visitable mixin
   * A visitable object is one that an operation can visit during update traversals
   */
  var visitable = makeMixin(function(){
  },{
    initVisitable: function(target, operation){
      this._allowKeys({
        _target: target,
        _operation: operation
      });
    },

    // scope chain methods
    resetScopeChain: function(){ this.set_processing_scopeChain(emptyScopeChain); },
    pushScope: function(type, scope, options){ this.set_processing_scopeChain(this.get_processing_scopeChain().extend(type, scope, options)); },

    // structure methods
    getTarget: function(){ return this.get('_target'); },
    getPredecessor: function(){
              debugger;
      return this._operation(this.getTarget().getPredecessor());
    },
    getContainer: memoizingMethod('_container', function(){
      return this._operation(this.getTarget().getContainer());
    }),


    // visiting planning methods

    // calling this method ensures that the directive (and all its prerequisites) will be considered for updating in the operation, and considered for a rendering update
    ensureVisit: function(){
      this.planToVisit().set({'_visitEnsured': true})._operation.addMember(this);
      return this;
    },
    //todo cleanup: change all planTo* to plan*
    //todo corner case bug: if isProcessing() has already processed the successor that is is necessary to visit, throw an error. same for containsPlannedVisit()
    planToVisitPrerequisites: function(){
      this.getPrerequisite() && this.getPrerequisite().planToVisit();
      return this;
    },
    getPrerequisite: function(){ return this.getPredecessor() || this.getContainer(); },
    planToVisit: function(){
      this.get('_plannedToVisit') || this.planToVisitPrerequisites().set('_plannedToVisit', true);
      return this;
    },
    //todo asdf: investigate ensured visits - they have to be members of the operation
    isPlannedToVisit: function(){ return this.get('_plannedToVisit'); },
    planToUpdate: function(){
      throwErrorIf(this.isProcessed(), 'cannot plan to update something already visited');
      this.ensureVisit().set_preprocessed_shouldUpdate(true);
      return this;
    },
    isProcessed: function(){ return this.get('_isProcessed'); },
    isProcessing: function(){ return this.get('_isProcessing'); },

    planToVisitSuccessors: function(){
      throwErrorIf(this.isProcessed(), 'cannot plan to update successors of something already visited');
      this.planToVisit().set_bequeathed_shouldVisitSuccessors(true);
      return this;
    },
    planToUpdateSuccessors: function(){
      this.planToVisitSuccessors().set_bequeathed_shouldUpdateSuccessors(true);
      return this;
    },
    planToVisitBranch: function(){ return this.planToVisit().planToVisitSuccessors(); },
    planToUpdateBranch: function(){ return this.planToUpdate().planToUpdateSuccessors(); },


    // visiting methods

    attemptVisit: function(repeatsLeft){
      throwErrorIf(!this._isOperation && !this._operation.isProcessing(), 'cannot visit an item without visiting its operation');

      // visit the predecessor if there is one, else the container if there is one
      if(this.getPredecessor()){
        this.getPredecessor().isProcessed() ? this.visit() : this.getPredecessor().attemptVisit();
      }else if(this.getContainer()){
        this.getContainer().isProcessing()  ? this.visit() : this.getContainer().attemptVisit();
      }else{
        this.visit();
      }

      if(this.get('_visitEnsured')){
        // some operations on ancestors can break the parent chain that leads to visiting this item. for ensured items, repeat until no ancestors do so
        // todo testing: this might not be necessary - check whether any ensured visits are ever skipped, even without this block
        repeatsLeft === undefined && (repeatsLeft = 100); //todo cleanup: magic number
        repeatsLeft ? this.isProcessed() || this.isTransitivelyPruned() || this.attemptVisit(--repeatsLeft) : throwError('Too many attempts to visit ensured item'); //You've done something in your directive that makes the parent directive change every time the current parent runs. This is most likely caused by lookups to function properties that mutate the DOM structure
      }

      return this;
    },

    isTransitivelyPruned: function(){
      //todo asdf: this needs to return differently at top of the prereq chain
      return this.isProcessed() ? this.get_bequeathed_pruned() : this.getPrerequisite().isTransitivelyPruned();
    },

    //todo corner case bug: isProcessed flag should keep track of the item's ancestry chain at visit time. When other items encouter this one while visiting members or successors, the isProcessed flag should be ignored if the ancestry chain has changed. this handles the case where a subsequently rendered item 'steals' the child of an already-rendered-once item
    visit: function(){
      // skip if already visiting or visited
      if(this.isProcessing() || this.isProcessed()){ return this; };

      //todo cleanup: change processing flags to be a state machine
      this.set({_isProcessing: true});
      this.process();
      this.set({_isProcessing: false, _isProcessed: true});
      this.visitSuccessors();
      return this;
    },

    visitSuccessors: function(){ this.eachSuccessor(this.considerVisitingSuccessor, this); },
    considerVisitingSuccessor: function(item){ item.isPlannedToVisit() && item.visit(); },

    eachSuccessor: function(block, context){
      this.getTarget().eachSuccessor(function(item){
        block.call(context || this, this._operation(item));
      }, this);
    },

    prune: function(){
      throwErrorIf(this.isProcessed(), 'cannot prune a visited item');
      this.set_preprocessed_pruned(true);
    },
    pruneSuccessors: function(){ this._set_bequeathed_pruned(true); },
    isPrunedSuccessors: function(){ return this.get_bequeathed_pruned(); },


    // state layer access methods

    _addInheritedProperty: function(key, options){
      return this._addStrictProperty('inherited_'+key, extend({
        memoizing: false,
        init: function(){
          // todo cleanup: this only works because no containers need to do work before handing off their preprocessed values to members. make a new function called getImparted() in the composable mixin that ensures we are in a processing state before providing the value
          //todo asdf: add get_imparted_* to composables
          return this.getPredecessor() ? this.getPredecessor()['get_bequeathed_'+key]() : this.getContainer()['get_imparted_'+key]();
        }
      }, options));
    },

    _addPreprocessedProperty: function(key, options){
      return this._addStrictProperty('preprocessed_'+key, extend({
        memoizing: true,
        init: function(key){ return this['get_bequeathed_'+key](); }
      }, options));
    },

    _addProcessedProperty: function(key, options){
      return this._addStrictProperty('processed_'+key, extend({
        memoizing: true,
        onSet: function(){ throwErrorI(this.isSet('_processed_'+key), 'already set processed value for '+key); },
        onGet: function(){ throwErrorIf(!this.isAfterVisiting(), 'only after visiting'); },
        init: function(key){ return this['get_processing_'+key](); }
      }, options));
    },

    _addBequeathedProperty: function(key, options){
      return this._addStrictProperty('bequeathed_'+key, extend({
        memoizing: true,
        onGet: function(){ throwErrorIf(!this.isAfterVisiting(), 'only after visiting'); },
        init: function(key){ return this['get_processed_'+key](); }
      }, options));
    },

    _addAllProperties: function(){
      for(var i = 0; i < arguments.length; i++){
        var key = arguments[i];
        this._addInheritedProperty(key);
        this._addPreprocessedProperty(key);
        this._addProcessingProperty(key);
        this._addProcessedProperty(key);
        this._addBequeathedProperty(key);
      }
    }

  });

  strictlyAccessed(visitable.prototype,
    '_container',
    {
      _isVisitable: true,
      _visitEnsured: false,
      _isProcessed: false,
      _isProcessing: false,
      _plannedToVisit: false
    }
  );

  visitable.prototype._addPreprocessedProperty('shouldUpdate', {
    init: function(){ return this.get_inherited_shouldUpdateSuccessors(); }
  });

  visitable.prototype._addBequeathedProperty('shouldUpdateSuccessors', {
    init: function(){
      return this.get_bequeathed_pruned() ? false : this.get_processed_shouldUpdateSuccessors();
    }
  });




  /*
   * visitable mixin
   * A visitable object is one that an operation can visit during update traversals
   */
  var composableVisitable = makeMixin(function(){
    // todo cleanup: add getter/setter checking for supporting browsers, and disallow direct access
    this.initVisitable(toArray(arguments));
  },{

    process: function(){ this.visitMembers(); },
    visitMembers: function(){ this.eachMember(this.considerVisitingMember, this); },
    considerVisitingMember: function(item){ item.isPlannedToVisit() && item.visit(); },

    eachMember: function(block, context){
      this.getTarget().eachMember(function(member){
        block.call(context || this, this._operation(member));
      }, this);
    },

    _addProcessingProperty: function(key, options){
      return this._addStrictProperty('processing_'+key, extend({
        memoizing: false,
        onGet: function(){ throwErrorIf(this.isBeforeVisiting(), 'only during to visiting'); },
        init: function(key){
          return this.getLastMemeber() ? this.getLastMemeber()['get_bequeathed_'+key]() : this['get_preprocessed_'+key]();
        }
      }, options));
    }

  });

  extend(composableVisitable.prototype, visitable.prototype);


  var uncomposableVisitable = makeMixin(function(){
    this.initVisitable(toArray(arguments));
  },{

    _addProcessingProperty: function(key, options){
      return this._addStrictProperty('processing_'+key, extend({
        memoizing: false,
        onGet: function(){ throwErrorIf(this.isBeforeVisiting(), 'only during to visiting'); },
        init: function(key){ return this['get_preprocessed_'+key](); }
      }, options));
    }

  });

  visitable(uncomposableVisitable.prototype);

  each([composableVisitable, uncomposableVisitable], function(mixin){
    mixin.prototype._addAllProperties('pruned', 'shouldUpdate', 'shouldVisitSuccessors', 'shouldUpdateSuccessors');
    mixin.prototype._addProcessingProperty('shouldUpdate', {
      init: function(){
        return (
          this.get_processing_pruned() ? false :
          this.get_preprocessed_shouldUpdate() ? true :
          this._customProcessingShouldUpdate && this._customProcessingShouldUpdate()
        );
      }
    });
  });






  /*
   * Directive
   */

  // provides an object representing the directive itself (for example, "contain user.name")

  var Directive = makeConstructor(function(boundAttribute, commandName, inputs){
    throwErrorIf(!commands[commandName], 'not a valid command: '+commandName);
    hierarchical(this, boundAttribute)._allowKeys({
      //todo cleanup: add a .getNode() to hierarchical()
      node: boundAttribute.get$$Node()[0],
      // todo clanup: make directives and boundAttributes store their command objects, rather than command names
      commandName: commandName,
      inputs: inputs,
      observers: {},
      key: undefined
    });
    this.set('key', this.makeKey());
  },{
    _isDirective: true,

    get$$Node: getContaining$$Node,
    getBoundAttribute: getContainingBoundAttribute,
    getPredecessor: function(){ return this.link.prev && this.link.prev.value; },

    write: function(){
      this.getBoundAttribute().write();
      return this;
    },

    //todo fixme: directives no longer write their command name into the toString - this breaks saving anything back into the react attribute
    toString: function(){ return this.get('inputs').join(' '); },

    makeKey: function(){
      var id = (this.get$$Node().getStorage('lastDirectiveId_'+this.get('commandName')) || 0) + 1;
      this.get$$Node().setStorage('lastDirectiveId_'+this.get('commandName'), id);
      return this.getContainer().get('key') + ' ' + id;
    }
  });

  Directive.is = function(thing){ return thing._isDirective; };


  //todo: make this a dependency tree
  var orderedCommandNames = [
    'debug', 'debugIf', 'log',
    'anchored',
    'bindItem', 'withinItem',
    'within',
    'if',
    'attr', 'attrIf', 'checkedIf', 'classIf', 'showIf', 'visIf',
    'for', 'withinEach', 'contain'
  ];
  var commandPrecedence = {};
  //todo cleanup: make the precedence dictated by the insertion order. allow an option for inserting before/after a given command name
  each(orderedCommandNames, function(commandName, index){
    commandPrecedence[commandName] = index;
  });





  /*
   * OpDirective
   */

  // provides an object representing an operation's perspective on the directive for the duration of that operation's execution

  var OpDirective = makeConstructor(function(directive, operation){
    // todo cleanup: opdirectives probably shouldn't delegate to directives
    var result = extend(uncomposableVisitable(this, directive, operation), OpDirective.prototype)._allowKeys({
      commandName: directive.get('commandName'),
      _dirtyObservers: {},
      _potentialObservers: [],
      // todo cleanup: get rid of .key? only store data in one place
      key: directive.get('key')
    });
    return result;
  },{

    _isOpDirective: true,

    constructor: OpDirective,

    getOpNode: getContainingOpNode,
    getOpBoundAttribute: getContainingOpBoundAttribute,

    getInputs: function(){ return this.getTarget().get('inputs'); },
    get$$Node: function(){ return this.getTarget().get$$Node(); },

    addPotentialObservers: function(potentialObserver){
      this.set('_potentialObservers', this.get('_potentialObservers').concat(potentialObservers));
    },

    dirtyObserver: function(observer){
      this._dirtyObservers[observer.key] = observer;
      return this.ensureVisit();
    },

    _customProcessingShouldUpdate: function(){
      return reduce(this._dirtyObservers, false, function(memo, observer){
        // ignore the object if it's not in the same path that lead to registration of the observer
        return memo || this.get_processing_scopeChain().resolve(observer.prefix + observer.propertyKey, {checkFocus: observer.object}).didMatchFocus;
      }, this);
    },

    considerVisitingSuccessor: visitItem,

    _registerPotentialObservers: function(run){
      each(this.get('_potentialObservers'), this._registerPotentialObserver, this);
    },

    _registerPotentialObserver: function(potentialObserver){
      new Observer(this.getTarget(), potentialObserver.scopeChain.scope, potentialObserver.key, potentialObserver.scopeChain.prefix);
    },

    process: function(){
      catchIf(debugging, this._runCommand, this._describeAndThrowError, this);
      if(this.get_preprocessed_shouldUpdate()) {
        this._registerPotentialObservers();
        //todo corner case: calling planToVisitAllDescendants() on the opNode should work for now because all successor opDirecives are guaranteed to be run, but if that stops being true this will break. make this more declarative of the intent by adding a definition of planToVisitAllDescendants that plans on subsequent directives and tells the container to visit all its descendants
        this.get_pocessed_planToUpdateSuccessors() && this.getOpNode().planToVisitAllDescendants();
      }
    },

    _runCommand: function(){
      commands[this.get('commandName')].run(new Run(this));
    },

    _describeAndThrowError: function(error){ throw this._describeError(error); },

    _describeError: function(error){
      var commandName = this.get('commandName');
      var inputs = this.getInputs();
      log('Failure during React update: ', {
        'original error': error,
        'original stack': error.stack && (error.stack.split ? error.stack.split('\n') : error.stack),
        'while processing node': this.get$$Node().get('node'),
         //todo cleanup: make all access to .key, .node, .command, .inputs, etc go through .get()
        'key of failed directive': this.get('key'),
         //todo cleanup: do we need this guard? inputs should always be an array, even if empty
        'directive call': commandName+'('+inputs && inputs.join(', ')+')'
      }, '(Supplemental dynamic data follows)');
      log('Supplemental: ', {
        'scope chain description': this.get_processing_scopeChain().describe(),
        '(internal scope chain object) ': this.get_processing_scopeChain()
      });
      return error;
    }


  });


  /*
   * Observer
   */

  var Observer = function(directive, object, propertyKey, prefix){
    var proxy = boundProxy(object);
    var key = [directive.get('key'), propertyKey, prefix].join(' ');
    var observersByProperty = proxy.observersByProperty[propertyKey] || (proxy.observersByProperty[propertyKey] = {});
    return proxy.observers[key] || (proxy.observers[key] = observersByProperty[key] = directive.observers[key] = extend(this, {
      object: object,
      propertyKey: propertyKey,
      prefix: prefix,
      directive: directive,
      key: key
    }));
  };








  var commands = {};
  var Command = makeConstructor(function(handler, resolver){
    extend(this, {
      handler: handler,
      resolver: resolver || (resolver === false ? Command._nonResolver : Command._fullResolver)
    });
  },{
    run: function(context){
      var args = this.resolver.call(context, context.get('_opDirective').getInputs());
      this.handler.apply(context, args);
    }
  });

  extend(Command, {
    commands: commands,
    add: function(name, handler, resolver){ Command.commands[name] = new Command(handler, resolver); },
    _nonResolver: function(names){ return names; },
    // todo cleanup: bind() shouldn't be necessary, map has a binding argument
    _fullResolver: function(names){ return map(names, bind(this.lookup, this)); }
  });







  var Run = makeConstructor(function(opDirective){
    extend(this, {_opDirective: opDirective});
  },{

    $: function(node){ return this._operation(node); },
    getScope: function(){ return this._opDirective.get_processing_scopeChain().scope; },

    onUpdate: function(callback, context){
      this._opDirective.get_processing_shouldUpdate() && callback && callback.call(context || this);
      return this;
    },

    lookup: function(key){
      var resolution = this._opDirective.get_processing_scopeChain().resolve(key);
      //todo cleanup: this can be done with push.apply()
      this._opDirective.addPotentialObservers(resolution.potentialObservers);
      return details.value;
    },

    _withScope: function(type, key){
      var scope = this.lookup(key);
      this.onUpdate(this.planToUpdateSuccessors, this);
      if(scope){
        this.get$$Node().removeClass('reactConditionallyHidden');
        this.pushScope(type, scope, {key:key});
      }else{
        this.get$$Node().addClass('reactConditionallyHidden');
        this.pruneSuccessors();
      }
    },

    _createItemNodes: function(callback){
      var $children = this.get$$Node().children();
      var $itemTemplate = $children.first().addClass('reactItemTemplate');
      if(!$itemTemplate.length){ return; }

      var collection = this.getScope();
      if(!isArray(collection)){ return this.pruneSuccessors(); }
      // this ensures that the directive will depend upon any changes to the length of the array
      this.lookup('length');

      var itemNodes = [], pregeneratedItemCount = 0, lastPregeneratedItem = $itemTemplate, itemsToRemove = [], i;
      for(i = 1; i < $children.length; i+=1){
        if(this.$($children[i]).get$$Node().hasClass('reactItem')){
          pregeneratedItemCount+=1;
          collection.length < pregeneratedItemCount ? itemsToRemove.push($children[i]) : (lastPregeneratedItem = $children[i]);
        }
      }
      var newItems = [], newItem;
      for(i = pregeneratedItemCount; i < collection.length; i+=1){
        callback.call(this, i, newItem = $itemTemplate.clone().removeClass('reactItemTemplate').addClass('reactItem')[0]);
        //todo optimization: compile template nodes into functions that can produce new items, attach compiler to node object
        this.$(newItem).planToUpdateAllDescendants();
        newItems.push(newItem);
      }
      //todo error: doesn't .detatch() clear all event handlers and metadata stuff?
      $(itemsToRemove).detach();
      $(newItems).insertAfter(lastPregeneratedItem);
    },

    _conditionalShow: function(conditional){ jQuery(this.node)[conditional ? 'show' : 'hide'](); },

    //todo cleanup: these methods simply proxy the opnode - there's got to be a cleaner way
    getOpNode:              function(){ return this.get('_opDirective').getOpNode(); },
    get$$Node:              function(){ return this.get('_opDirective').get$$Node(); },
    planToUpdateSuccessors: function(){ return this.get('_opDirective').planToUpdateSuccessors(); },
    pruneSuccessors:        function(){ return this.get('_opDirective').pruneSuccessors(); }

  });











  /*
   * commands
   */

  Command.add('log', function(){
    typeof console !== 'undefined' && console.log('React render state:', {
      directive:this,
      scope:this.getScope(),
      inputs:arguments
    });
  });

  Command.add('anchored', function(){
    each(this.get$$Node().anchors, function(anchor){ this.pushScope('anchor', anchor); }, this);
    this.onUpdate(this.planToUpdateSuccessors, this);
  }, false);

  Command.add('within', function(key){
    this._withScope('within', key);
  }, false);

  Command.add('withinItem', function(key){
    // todo: add a rule to only allow getting items from last scope (check if key < scope.length?)
    // todo: add a rule to make sure the last scope object is an array
    var scope = this.getScope();
    if(isArray(scope) && +key < scope.length && scope[key]){
      this._withScope('withinItem', key);
    }else{
      this.pruneSuccessors();
    }
  }, false);

  Command.add('withinEach', function(){
    this.onUpdate(function() {
      this._createItemNodes(function(index, itemNode){
        //todo cleanup: we should only have access to the node in these commands, not the opnode
        this.$(itemNode).get$$Node().getBoundAttribute('withinItem').add([index]);
      });
      this.planToUpdateSuccessors();
    }, this);
  });

  Command.add('bindItem', function(key, keyAlias, valueAlias){
    if(valueAlias === undefined){
      valueAlias = keyAlias;
      keyAlias = undefined;
    }

    // set up an item scope to be applied for each item
    // a new scope will be created with bindings for valueAlias and optionally for keyAlias
    var itemBindings = {};
    if(keyAlias !== undefined){
      itemBindings[keyAlias] = key;
    }
    itemBindings[valueAlias] = new Fallthrough(key);

    this.pushScope('bindItem', itemBindings, {key:key});

    //todo cleanup: doesn't onUpdate already handle this binding? this can be removed from a fair number of places
    this.onUpdate(this.planToUpdateSuccessors, this);
  }, false);

  //todo api: change from for - too similar to html for attribute and javascript for keyword
  Command.add('for', function(keyAlias, valueAlias){
    var aliases = slice(arguments);
    this.onUpdate(function(){
      // todo: return here (and everywhere else) if collection is undefined.  test for this
      this._createItemNodes(function(index, itemNode){
        this.$(itemNode).get$$Node().getBoundAttribute('bindItem').add([index].concat(aliases));
      });
      this.planToUpdateSuccessors();
    });
  }, false);

  Command.add('contain', function(content){
    this.onUpdate(function(){
      // using innerHTML to clear the node because the jQuery convenience functions unbind event handlers. This would be an unexpected side effect for most React user consumption cases.
      this.get$$Node()[0].innerHTML = '';
      // if the content is a node, use the dom appending method, but insert other items as text
      var insertionMethod = content && content.nodeType ? 'append' : 'text';
      this.get$$Node()[0][insertionMethod](content);
      // note: .pruneSuccessors() can't happen outside onUpdate() because disabling mutation should only happen when the branch is inserted, not when building an initial scope chain
      this.getOpNode().pruneSuccessors();
    });
    this.resetScopeChain();
  });

  Command.add('value', function(key){
    this.get$$Node().val(this.lookup(key));
  });

  Command.add('if', function(condition){
    condition || this.pruneSuccessors();
    this.onUpdate(function(){
      this.get$$Node()[condition ? 'removeClass' : 'addClass']('reactConditionallyHidden');
      this._conditionalShow(condition);
      this.planToUpdateSuccessors();
    });
  });

  Command.add('showIf', function(condition){
    this.onUpdate(function(){
      this._conditionalShow(condition);
    });
  });

  Command.add('visIf', function(condition){
    this.onUpdate(function(){
      get$$Node().css('visibility', condition ? 'visible' : 'hidden');
    });
  });

  Command.add('classIf', function(conditionKey, nameKey){
    this.onUpdate(function(){
      var $$node = this.get$$Node();
      //todo cleanup: we can put persistant storage directly on the directive object itself
      $$node.classIfs = $$node.classIfs || {};
      var condition = this.lookup(conditionKey);
      var persistence = conditionKey + ' ' + nameKey;
      var className = this.lookup(nameKey);

      if($$node.classIfs[persistence] && (!condition || $$node.classIfs[persistence] !== className)){
        $$node.removeClass($$node.classIfs[persistence]);
        delete $$node.classIfs[persistence];
      }

      if(typeof className === 'string'){
        if(condition){
          $$node.addClass(className);
          $$node.classIfs[persistence] = className;
        }else{
          $$node.removeClass(className);
        }
      }
    });
  }, false);

  Command.add('attr', function(name, value){
    throwErrorIf(arguments.length !== 2, 'the attr directive requires 2 arguments');
    this.onUpdate(function(){
      if(!among(typeof value, ['string', 'number', 'undefined'])){
        log('bad attr name: ', name);
        throwError('expected attr name token ' + name + ' to resolve to a string, a number, null, or undefined, not ' + typeof name);
      }else if(!among(typeof value, ['string', 'number', 'undefined'])){
        log('bad attr value: ', value);
        throwError('expected attr value token ' + value + ' to resolve to a string, a number, null, or undefined, not ' + typeof value);
      }
      this.get$$Node().attr(name, value);
    });
  });

  Command.add('attrIf', function(condition, name, value){
    this.onUpdate(function(){
      condition ? this.get$$Node().attr(name, value) : this.get$$Node().removeAttr(name);
    });
  });

  Command.add('checkedIf', function(condition){
    this.onUpdate(function(){
      this.get$$Node().attr('checked', !!condition);
    });
  });


  /*
   * Exporting library
   */

  global.jQuery && react.integrate.jQuery();
  global.Backbone && react.integrate.Backbone();
  global.react = react;

}());
