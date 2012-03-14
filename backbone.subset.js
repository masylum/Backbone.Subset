/**
 * @class  Backbone.Subset
 * @name   Backbone Subset collections
 * @desc   Implements a collection that is a subset other Backbone Collections
*/
(function () {

  var Subset = {}

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
    if (options.parent) this.parent = options.parent;

    // A parent is required at this point
    if (!(parent = getValue(this, 'parent'))) {
      throw new Error("Can't create a subset without a parent collection");
    }

    this.model = parent.model;
    this.comparator = this.comparator || options.comparator || parent.comparator;
    this.liveupdate_keys = this.liveupdate_keys || options.liveupdate_keys || 'none';

    _.bindAll(this, '_onModelEvent', '_unbindModelEvents', '_proxyEvents');

    parent.bind('all', this._proxyEvents);

    if (this.beforeInitialize) {
      this.beforeInitialize.apply(this, arguments);
    }

    if (!options.no_reset) {
      this._reset();

      if (models) {
        this.reset(models, {silent: true});
      }
    }
    else {
      this._resetSubset(parent.models, {silent: true});
    }

    this.initialize.apply(this, arguments);
  };

  /**
   * Resets the parent collection
   *
   * @param {Object} models
   * @param {Object} options
   * @return {Object} collection
   */
  Subset.reset = function (models, options) {
    var parent = getValue(this, 'parent')
      , parent_models = _.clone(parent.models)
      , ids = _(parent_models).pluck('id');

    models = models || [];
    models = _.isArray(models) ? models : [models];
    options = options || {};

    // insert parent reseted models
    _.each(models, function (model) {
      if (ids.indexOf(model.id) === -1) {
        parent_models.push(model);
      }
    }, this);

    parent.reset(parent_models, _.extend(options, {subset_reset: true}));

    this._resetSubset(models, options);

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
    var changed = false;

    // re-evaluate each model's eligibility
    this._parent.each(function (model) {
      changed |= this._updateModelMembership(model);
    }, this);

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
  Subset._resetSubset = function (models, options) {
    models = models || [];
    models = _.isArray(models) ? models : [models];
    options = options || {};
    this.each(this._unbindModelEvents);
    this._reset();

    _(models).each(function (model) {
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
    return getValue(this, 'parent').add(model, options);
  };

  /**
   * Adds a model into the subset collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Subset._addToSubset = function (model, options) {
    var parent = getValue(this, 'parent')
      , parents_model;

    if (model.id && (parents_model = parent.get(model.id))) {
      if (!(model instanceof Backbone.Model)) {
        parents_model.set(model, {silent: true});
        model = parents_model;
      }
      else {
        parents_model.set(model.attributes, {silent: true});
        model = parents_model;
      }
    }
    else {
      model = Backbone.Collection.prototype._prepareModel.call(this, model, options);
    }

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
    return getValue(this, 'parent').remove(model, options);
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
    var parent = getValue(this, 'parent');

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
   * Proxies an event happening into the parent collection to the Subset
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Subset._proxyEvents = function (ev, model, collection, options) {
    if (collection !== this) {
      if (ev === 'change' && this.liveupdate_keys === 'all') {
        this._updateModelMembership(model);
      } else if (ev.slice(0, 7) === 'change:' && _.isArray(this.liveupdate_keys)
                 && _.include(this.liveupdate_keys, ev.slice(7))) {
        this._updateModelMembership(model);
      }

      if (ev === 'add' && this.sieve(model) && !options.noproxy) {
        this._addToSubset(model, options);
      }

      if (ev === 'remove' && this.sieve(model) && !options.noproxy) {
        this._removeFromSubset(model, options);
      }
    }

    // model == collection
    if (ev === 'reset' && model !== this) {
      if (!collection.subset_reset) {
        this._resetSubset(model.models, collection);
      }
    }
  };

  /**
   * Determines whether a model should be in the subset, and adds or removes it.
   * Returns a boolean indicating if the model's membership changed.
   *
   * @param {Object} model
   * @return {Boolean} changed
   */
  Subset._updateModelMembership = function (model) {
    var hasId = !model.id
      , alreadyInSubset = this._byCid[model.cid] || (hasId && this._byId[model.id]);

    if (this.sieve(model)) {
      if (!alreadyInSubset) {
        this._addToSubset(model);
        return true;
      }
    } else {
      if (alreadyInSubset) {
        this._removeFromSubset(model);
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

  /**
   * Duplicate of Backbone property getter
   */
  function getValue(object, prop) {
    if (!(object && object[prop])) return null;
    return _.isFunction(object[prop]) ? object[prop]() : object[prop];
  };

  _.extend(Backbone.Subset.prototype, Backbone.Collection.prototype, Subset);
  Backbone.Subset.extend = Backbone.Collection.extend;
}).call(this);
