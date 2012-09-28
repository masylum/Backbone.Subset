/**
 * @class  Backbone.Subset
 * @name   Backbone Subset collections
 * @desc   Implements a collection that is a subset other Backbone Collections
*/
(function () {

  var Subset = {};

  /**
   * Returns the xor of two sets
   *
   * @param {Array} a
   * @param {Array} b
   * @return {Array}
   */
  function xor(a, b) {
    return _.difference(_.union(a, b), _.intersection(a, b));
  }

  /**
   * Subset constructor
   *
   * @param {String|Object} type
   * @param {Number} id
   * @return {Object}
   */
  Backbone.Subset = function Subset(models, options) {
    var parent;

    options = options || {};

    if (options.parent) {
      this.parent = options.parent;
    }

    // A parent is required at this point
    if (!(parent = _.result(this, 'parent'))) {
      throw new Error("Can't create a subset without a parent collection");
    }

    this.model = parent.model;
    this.comparator = this.comparator || options.comparator || parent.comparator;
    this.liveupdate_keys = this.liveupdate_keys || options.liveupdate_keys || 'none';

    _.bindAll(this, '_onModelEvent', '_unbindModelEvents', '_proxyAdd'
              , '_proxyReset', '_proxyRemove', '_proxyChange');

    parent.bind('add', this._proxyAdd);
    parent.bind('remove', this._proxyRemove);
    parent.bind('reset', this._proxyReset);
    parent.bind('all', this._proxyChange);

    if (this.beforeInitialize) {
      this.beforeInitialize.apply(this, arguments);
    }

    if (!options.no_reset) {
      this._reset();
      this.reset(models || parent.models, {silent: true});
    } else {
      this._resetSubset({silent: true});
    }

    this.initialize.apply(this, arguments);
  };

  /**
   * Default exclusiveSubset implementation
   *
   * @return {Boolean}
   */
  Subset.exclusiveSubset = function () {
    return false;
  };

  /**
   * Resets the parent collection
   *
   * @param {Object} models
   * @param {Object} options
   * @return {Object} collection
   */
  Subset.reset = function (models, options) {
    var parent = _.result(this, 'parent')
      , parent_models = _.clone(parent.models)
      , xored_ids
      , ids = this.pluck('id');

    models = models || [];
    models = _.isArray(models) ? models : [models];
    options = options || {};

    // delete parent reseted models
    parent_models = _.reject(parent_models, function (model) {
      return _.include(ids, model.id);
    });

    // insert parent reseted models
    _.each(models, function (model) {
      parent_models.push(model);
    });

    // xored ids are the ones added/removed
    xored_ids = xor(ids, _.pluck(models, 'id'));

    parent.reset(parent_models, _.extend({silent: true}, options));
    if (this.exclusiveSubset()) {
      parent.trigger('reset', this, _.extend({model_ids: xored_ids, exclusive_collection: this}, options));
    } else {
      parent.trigger('reset', this, _.extend({model_ids: xored_ids}, options));
    }

    return this;
  };

  /**
   * Re-applies the sieve to the subset
   *
   * @param {Object} options
   * @return {Object} collection
   */
  Subset.recalculate = function (options) {
    options = options || {};

    var changed
      , self = this;

    // re-evaluate each model's eligibility
    changed = _.result(this, 'parent').reduce(function (changed, model) {
      return self._updateModelMembership(model, {silent: true}) || changed;
    }, false);

    // only trigger reset event if the subset actually changed
    if (changed && !options.silent) {
      this.trigger('reset', this, options);
    }

    return this;
  };

  /**
   * Resets the subset collection
   *
   * @param {Object} models
   * @param {Object} options
   * @return {Object} collection
   */
  Subset._resetSubset = function (options) {
    options = options || {};
    this.each(this._unbindModelEvents);
    this._reset();

    _.result(this, 'parent').each(function (model) {
      this._addToSubset(model, {silent: true});
    }, this);

    if (!options.silent) {
      this.trigger('reset', this, options);
    }

    return this;
  };

  /**
   * Adds a model into the parent collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Subset.add = function (model, options) {
    if (this.exclusiveSubset()) {
      options = _.extend(options, {exclusive_collection: this});
    }

    return _.result(this, 'parent').add(model, options);
  };

  /**
   * Adds a model into the subset collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Subset._addToSubset = function (model, options) {
    if (this.sieve(model)) {
      return Backbone.Collection.prototype.add.call(this, model, options);
    }
  };

  /**
   * Remove a model from the subset collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Subset.remove = function (model, options) {
    if (this.exclusiveSubset()) {
      options = _.extend(options, {exclusive_collection: this});
    }

    return _.result(this, 'parent').remove(model, options);
  };

  /**
   * Removes a model from the subset collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Subset._removeFromSubset = function (model, options) {
    return Backbone.Collection.prototype.remove.call(this, model, options);
  };

  /**
   * Prepare a model to be added to a collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Subset._prepareModel = function (model, options) {
    var parent = _.result(this, 'parent');

    if (!(model instanceof Backbone.Model)) {
      var attrs = model;
      model = new this.model(attrs, {collection: parent});

      if (model.validate && !model._performValidation(model.attributes, options)) {
        model = false;
      }
    } else if (!model.collection) {
      model.collection = parent;
    }
    model = this.sieve(model) ? model : false;
    return model;
  };

  /**
   * Proxies an `add` event happening into the parent collection to the Subset
   *
   * @param {Object} model
   * @param {Object} collection
   * @param {Object} options
   */
  Subset._proxyAdd = function (model, collection, options) {
    options = options || {};

    if (options.exclusive_collection && options.exclusive_collection !== this) {
      return;
    }

    if (collection !== this && this.sieve(model) && !options.noproxy) {
      this._addToSubset(model, options);
    }
  };

  /**
   * Proxies a `remove` event happening into the parent collection to the Subset
   *
   * @param {Object} model
   * @param {Object} collection
   * @param {Object} options
   */
  Subset._proxyRemove = function (model, collection, options) {
    options = options || {};

    if (options.exclusive_collection && options.exclusive_collection !== this) {
      return;
    }

    if (collection !== this && this.sieve(model) && !options.noproxy) {
      this._removeFromSubset(model, options);
    }
  };

  /**
   * Proxies a `change` event happening into the parent collection to the Subset
   *
   * @param {Object} ev
   * @param {Object} model
   * @param {Object} collection
   */
  Subset._proxyChange = function (ev, model, collection) {
    if (collection !== this && ev === 'change' && this.liveupdate_keys === 'all') {
      this._updateModelMembership(model);
    } else if (ev.slice(0, 7) === 'change:' && _.isArray(this.liveupdate_keys)
               && _.include(this.liveupdate_keys, ev.slice(7))) {
      this._updateModelMembership(model);
    }
  };

  /**
   * Proxies a `reset` event happening into the parent collection to the Subset
   *
   * @param {Object} collection
   * @param {Object} options
   */
  Subset._proxyReset = function (collection, options) {
    options = options || {};

    var sieved_models
      , self = this;

    if (options.exclusive_collection && options.exclusive_collection !== this) {
      return;
    }

    function getSievedModels() {
      return _.filter(options.model_ids, function (id) {
        var model = self.parent().get(id) || self.get(id);
        return model && self.sieve(model);
      });
    }

    if ((!options || !options.noproxy) && (!options.model_ids || this === collection || getSievedModels().length)) {
      this._resetSubset(_.extend(_.clone(options), {proxied: true}));
    }
  };

  /**
   * Determines whether a model should be in the subset, and adds or removes it.
   * Returns a boolean indicating if the model's membership changed.
   *
   * @param {Object} model
   * @return {Boolean} changed
   */
  Subset._updateModelMembership = function (model, options) {
    var hasId = !model.id
      , alreadyInSubset = this._byCid[model.cid] || (hasId && this._byId[model.id]);

    if (this.sieve(model)) {
      if (!alreadyInSubset) {
        this._addToSubset(model, options);
        return true;
      }
    } else {
      if (alreadyInSubset) {
        this._removeFromSubset(model, options);
        return true;
      }
    }

    return false;
  };

  /**
   * Unbinds the _onModelEvent listener
   *
   * @param {Object} model
   */
  Subset._unbindModelEvents = function (model) {
    model.unbind('all', this._onModelEvent);
  };

  _.extend(Backbone.Subset.prototype, Backbone.Collection.prototype, Subset);
  Backbone.Subset.extend = Backbone.Collection.extend;
}());
