  /*
   * Two-way mapping
   */

  var TwoWayMap = function(serialized){
    extend(this, { _ltr: {}, _rtl: {} });
    serialized && this.fromString(serialized);
  };

  extend(TwoWayMap.prototype, {
    map: function(left, right){
      throwErrorIf(this._ltr[left], 'mapping already exists for left ', left);
      throwErrorIf(this._rtl[right], 'mapping already exists for right ', right);
      this._ltr[left] = right;
      this._rtl[right] = left;
    },

    getLeft: function(right){ return this._rtl[right]; },
    getRight: function(left){ return this._ltr[left]; },

    releaseLeft: function(left){
      delete this._rtl[this._ltr[left]];
      delete this._ltr[left];
    },

    releaseRight: function(right){
      delete this._ltr[this._rtl[right]];
      delete this._rtl[right];
    },

    // note: these serialization and de-serialization functions are built to work only with the case where all left-side values are sequential indices
    toString: function(){
      return reduce(this._ltr, [], function(memo, right, left){
        memo[left] = right;
      }).join(',');
    },

    fromString: function(string){
      each(filter(string.split(',')), function(right, left){
        this.map(left, right);
      }, this);
    }

  });
