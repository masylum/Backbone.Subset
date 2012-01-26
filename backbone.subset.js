/**
 * @class  Backbone.Subset
 * @name   Backbone Subset collections
 * @desc   Implements a collection that is a subset other Backbone Collections
*/
(function () {

  var root = this
    , Subset = {}
    , _ = root._;

  if (!_ && (typeof require !== 'undefined')) {
    _ = require('underscore')._;
  }

  /**
   * Subset constructor
   *
   * @param {String|Object} type
   * @param {Number} id
   * @return {Object}
   */
  Backbone.Subset = function Subset(models, options) {
    options = options || {};

    this.model = this.parent().model;
    this.comparator = this.comparator || options.comparator || this.parent().comparator;
    this.liveupdate_keys = this.liveupdate_keys || options.liveupdate_keys || 'none';

    _.bindAll(this, '_onModelEvent', '_unbindModelEvents', '_proxyEvents');

    this.parent().bind('all', this._proxyEvents);

    this._reset();
    this.reset(models || this.parent().models, {silent: true});
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
    models = models || [];
    models = _.isArray(models) ? models : [models];
    options = options || {};

    // delete parent reseted models
    this.each(function (model) {
      this.parent()._remove(model, _.extend(options, {noproxy: true}));
    }, this);

    // insert parent reseted models
    _.each(models, function (model) {
      this.parent()._add(model, _.extend(options, {noproxy: true}));
    }, this);

    return this._resetSubset(models, options);
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

    this.parent().each(function (model) {
      if (this.sieve(model)) {
        this._addToSubset(model, {silent: true});
      }
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
  Subset._add = function (model, options) {
    return this.parent()._add(model, options);
  };

  /**
   * Adds a model into the subset collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Subset._addToSubset = function (model, options) {
    return Backbone.Collection.prototype._add.call(this, model, options);
  }

  /**
   * Remove a model from the subset collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Subset._remove = function (model, options) {
    return this.parent()._remove(model, options);
  };

  /**
   * Removes a model from the subset collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Subset._removeFromSubset = function (model, options) {
    return Backbone.Collection.prototype._remove.call(this, model, options);
  }

  /**
   * Prepare a model to be added to a collection
   *
   * @param {Object} model
   * @param {Object} options
   * @return {Object} model
   */
  Subset._prepareModel = function (model, options) {
    if (!(model instanceof Backbone.Model)) {
      var attrs = model;
      model = new this.model(attrs, {collection: this.parent()});

      if (model.validate && !model._performValidation(model.attributes, options)) {
        model = false;
      }
    } else if (!model.collection) {
      model.collection = this.parent();
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
    if ( collection !== this) {
      if (ev === 'change' && this.liveupdate_keys === 'all') {
        this._updateModelMembership(model);
      } else if (ev.slice(0,7) == 'change:' && _.isArray(this.liveupdate_keys) && _.include(this.liveupdate_keys, ev.slice(7))) {
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
    if (ev === 'reset' && model !== this && model.any(this.sieve)) {
      this._resetSubset(model.models, collection);
    }
  };

  /**
   * Determines whether a model should be in the subset, and adds or removes it
   * @param {Object} model
   */
  Subset._updateModelMembership = function(model) {
    var hasId = model.id != null;
    var alreadyInSubset = this._byCid[model.cid] || (hasId && this._byId[model.id]);

    if (this.sieve(model)) {
      !alreadyInSubset && this._addToSubset(model);
    } else {
      alreadyInSubset && this._removeFromSubset(model);
    }
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
}).call(this);
