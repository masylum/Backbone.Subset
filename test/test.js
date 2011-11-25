/*global it, describe*/
var _ = require('underscore')
  , assert = require('assert')
  , happened = {}
  , Models = {}
  , Collections = {}

  // instances
  , tasks, archived_tasks;

function inc(what) {
  return function () {
    happened[what]++;
  }
}

GLOBAL.Backbone = require('backbone');
require('../backbone.subset');

Models.Task = Backbone.Model.extend({
  initialize: function () {
    this.collection = tasks;
  }
, isArchived: function () {
    return !!this.get('archived');
  }
});

Collections.Tasks = Backbone.Collection.extend({model: Models.Task});
Collections.ArchivedTasks = Backbone.Subset.extend({
  parent: function () {
    return tasks;
  }
, sieve: function (task) {
    return task.isArchived();
  }
});

tasks = new Collections.Tasks();
archived_tasks = new Collections.ArchivedTasks();

// lengths
describe('Subset', function () {
  it('has a `add` function that behaves like the `Collection` one + bubbling', function () {
    happened = {tasks: 0, archived_tasks: 0};
    tasks.bind('add', inc('tasks'));
    archived_tasks.bind('add', inc('archived_tasks'));

    for (var i = 0; i < 4; i++) {
      archived_tasks.add({id: i, archived: i % 2});
    }

    assert.equal(happened.tasks, 4);
    assert.equal(happened.archived_tasks, 2);

    assert.equal(tasks.length, 4);
    assert.equal(archived_tasks.length, 2);
  });

  it('contains corrects cids', function () {
    assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c0', 'c1', 'c2', 'c3']);
    assert.deepEqual(_.pluck(archived_tasks.models, 'cid'), ['c1', 'c3']);
  });

  it('contains corrects ids', function () {
    assert.deepEqual(tasks.pluck('id'), [0, 1, 2, 3]);
    assert.deepEqual(archived_tasks.pluck('id'), [1, 3]);
  });

  it('has a `get` function that behaves like the `Collection` one + bubbling', function () {
    assert.deepEqual(tasks.get(1), archived_tasks.get(1));
    assert.ifError(archived_tasks.get(0));
  });

  it('has a `remove` function that removes also from the parent collection', function () {
    happened = {tasks: 0, archived_tasks: 0};
    tasks.bind('remove', inc('tasks'));
    archived_tasks.bind('remove', inc('archived_tasks'));

    archived_tasks.remove([{id: 0}, {id: 1}]);

    assert.equal(happened.tasks, 2);
    assert.equal(happened.archived_tasks, 1);

    assert.deepEqual(tasks.pluck('id'), [2, 3]);
    assert.deepEqual(archived_tasks.pluck('id'), [3]);
  });
});

describe('Aggregated collections', function () {
  it('proxies the `add` event', function () {
    happened = {tasks: 0, archived_tasks: 0};

    tasks.unbind('add');
    archived_tasks.unbind('add');
    tasks.bind('add', inc('tasks'));
    archived_tasks.bind('add', inc('archived_tasks'));

    tasks.add([{id: 0, archived: 0}, {id: 1, archived: 1}]);

    assert.equal(happened.tasks, 2);
    assert.equal(happened.archived_tasks, 1);

    assert.deepEqual(tasks.pluck('id'), [2, 3, 0, 1]);
    assert.deepEqual(archived_tasks.pluck('id'), [3, 1]);
    assert.deepEqual(_.pluck(tasks.models, 'cid'), ["c2","c3","c4","c5"]);
    assert.deepEqual(_.pluck(archived_tasks.models, 'cid'), ['c3', 'c5']);
  });

  it('proxies the `remove` event', function () {
    happened = {archived_tasks: 0, tasks: 0};

    tasks.unbind('remove');
    archived_tasks.unbind('remove');
    tasks.bind('remove', inc('tasks'));
    archived_tasks.bind('remove', inc('archived_tasks'));

    tasks.remove([{id: 0}, {id: 1}]);

    assert.equal(happened.tasks, 2);
    assert.equal(happened.archived_tasks, 1);

    assert.deepEqual(tasks.pluck('id'), [2, 3]);
    assert.deepEqual(archived_tasks.pluck('id'), [3]);
    assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c2', 'c3']);
    assert.deepEqual(_.pluck(archived_tasks.models, 'cid'), ['c3']);
  });

  it('proxies the `change` event', function () {
    happened = {archived_tasks: 0, tasks: 0, tasks_attr: 0, archived_tasks_attr: 0};

    tasks.bind('change', inc('tasks'));
    archived_tasks.bind('change', inc('archived_tasks'));
    tasks.bind('change:name', inc('tasks_attr'));
    archived_tasks.bind('change:name', inc('archived_tasks_attr'));

    tasks.get(2).set({name: 'fleiba'});
    tasks.get(3).set({name: 'zemba'});

    assert.equal(happened.tasks, 2);
    assert.equal(happened.archived_tasks, 1);
    assert.equal(happened.tasks_attr, 2);
    assert.equal(happened.archived_tasks_attr, 1);

    assert.equal(tasks.get(2).get('name'), 'fleiba');
    assert.equal(tasks.get(3).get('name'), 'zemba');
    assert.equal(archived_tasks.get(3).get('name'), 'zemba');
  });

  it('proxies the `reset` event', function () {
    happened = {archived_tasks: 0, tasks: 0};

    tasks.bind('reset', inc('tasks'));
    archived_tasks.bind('reset', inc('archived_tasks'));

    tasks.reset([{id: 0, archived: 0}, {id: 1, archived: 1}]);

    assert.equal(happened.tasks, 1);
    assert.equal(happened.archived_tasks, 1);

    assert.deepEqual(tasks.pluck('id'), [0, 1]);
    assert.deepEqual(archived_tasks.pluck('id'), [1]);
    assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c6', 'c7']);
    assert.deepEqual(_.pluck(archived_tasks.models, 'cid'), ['c7']);

    happened = {archived_tasks: 0, tasks: 0, tasks_add: 0, archived_tasks_add: 0, tasks_remove: 0, archived_tasks_remove: 0};
    tasks.unbind('add');
    archived_tasks.unbind('add');
    tasks.unbind('reset');
    archived_tasks.unbind('reset');
    tasks.unbind('remove');
    archived_tasks.unbind('remove');

    tasks.bind('add', inc('tasks_add'));
    archived_tasks.bind('add', inc('threads_add'));
    tasks.bind('reset', inc('tasks'));
    archived_tasks.bind('reset', inc('archived_tasks'));
    tasks.bind('remove', inc('tasks_remove'));
    archived_tasks.bind('remove', inc('archived_tasks_remove'));

    archived_tasks.reset([{id: 4, archived: 0}, {id: 5, archived: 1}]);

    assert.equal(happened.tasks, 0);
    assert.equal(happened.archived_tasks, 1);
    assert.equal(happened.tasks_add, 2);
    assert.equal(happened.archived_tasks_add, 0);
    assert.equal(happened.tasks_remove, 1);
    assert.equal(happened.archived_tasks_remove, 0);

    assert.deepEqual(tasks.pluck('id'), [0, 4, 5]);
    assert.deepEqual(archived_tasks.pluck('id'), [5]);
    assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c6', 'c8', 'c9']);
    assert.deepEqual(_.pluck(archived_tasks.models, 'cid'), ['c11']);
  });
});
