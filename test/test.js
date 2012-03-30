/*global it, describe, before, beforeEach*/
var _ = require('underscore')
  , assert = require('assert')
  , happened = {}
  , Models = {}
  , Collections = {}
  , counter = 0

  // instances
  , tasks, archived_tasks, urgent_tasks,  project, project_tasks;

function inc(what) {
  return function () {
    happened[what]++;
  };
}
function assertElements(a, b) {
  assert.deepEqual(_.sortBy(a, String), _.sortBy(b, String));
}

// MOCK CID
_.uniqueId = function (prefix) {
  var id = counter++;
  return prefix ? prefix + id : id;
};

GLOBAL.Backbone = require('backbone');
require('../backbone.subset');

Models.Task = Backbone.Model.extend({
  initialize: function () {
    this.collection = tasks;
  }
, isArchived: function () {
    return !!this.get('archived');
  }
, isUrgent: function () {
    return !!this.get('urgent');
  }
});

Models.Project = Backbone.Model.extend({});

Collections.Tasks = Backbone.Collection.extend({
  model: Models.Task
, name: 'Tasks'
, comparator: function (m) {
    return m.get('order');
  }
});

Collections.ArchivedTasks = Backbone.Subset.extend({
  parent: function () {
    return tasks;
  }
, name: 'ArchivedTasks'
, sieve: function (task) {
    return task.isArchived();
  }
, comparator: function (m) {
    return -m.get('order');
  }
});

Collections.UrgentTasks = Backbone.Subset.extend({
  parent: function () {
    return tasks;
  }
, name: 'UrgentTasks'
, sieve: function (task) {
    return task.isUrgent();
  }
, comparator: function (m) {
    return -m.get('order');
  }
, urgent: function () {
    return true;
  }
});

Collections.ProjectTasks = Backbone.Subset.extend({
  beforeInitialize: function (models, options) {
    this.project = options.project;
  }
, name: 'ProjectTasks'
, parent: function () {
    return tasks;
  }
, sieve: function (task) {
    if (this.project) {
      return this.project.id === task.get('project_id');
    }
    else {
      return false;
    }
  }
});

// lengths
describe('Subset', function () {
  beforeEach(function () {
    tasks = new Collections.Tasks();
    archived_tasks = new Collections.ArchivedTasks();
    urgent_tasks = new Collections.UrgentTasks();

    // counters
    happened = {tasks: 0, archived_tasks: 0, urgent_tasks: 0};

    // reset cids
    counter = 0;

    // Initial state
    for (var i = 0; i < 2; i++) {
      archived_tasks.add({id: i, archived: i % 2, order: i});
    }
  });

  it('has a `add` function that behaves like the `Collection` one + bubbling', function () {
    tasks.bind('add', inc('tasks'));
    archived_tasks.bind('add', inc('archived_tasks'));

    archived_tasks.add({id: 2, archived: 0, order: 2});
    archived_tasks.add({id: 3, archived: 1, order: 3});

    assert.equal(happened.tasks, 2);
    assert.equal(happened.archived_tasks, 1);

    assert.equal(tasks.length, 4);
    assert.equal(archived_tasks.length, 2);
  });

  it('contains corrects cids', function () {
    assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c0', 'c1']);
    assert.deepEqual(_.pluck(archived_tasks.models, 'cid'), ['c1']);
  });

  it('contains corrects ids', function () {
    assert.deepEqual(tasks.pluck('id'), [0, 1]);
    assert.deepEqual(archived_tasks.pluck('id'), [1]);
  });

  it('has a `get` function that behaves like the `Collection` one + bubbling', function () {
    assert.deepEqual(tasks.get(1), archived_tasks.get(1));
    assert.ifError(archived_tasks.get(0));
  });

  it('has a `remove` function that removes also from the parent collection', function () {
    tasks.bind('remove', inc('tasks'));
    archived_tasks.bind('remove', inc('archived_tasks'));

    archived_tasks.remove([{id: 0}]);

    assert.equal(happened.tasks, 1);
    assert.equal(happened.archived_tasks, 0);

    assert.deepEqual(tasks.pluck('id'), [1]);
    assert.deepEqual(archived_tasks.pluck('id'), [1]);

    archived_tasks.remove([{id: 1}]);

    assert.equal(happened.tasks, 2);
    assert.equal(happened.archived_tasks, 1);

    assert.deepEqual(tasks.pluck('id'), []);
    assert.deepEqual(archived_tasks.pluck('id'), []);
  });

  describe('Aggregated collections', function () {

    it('proxies the `add` event', function () {
      tasks.bind('add', inc('tasks'));
      archived_tasks.bind('add', inc('archived_tasks'));

      tasks.add([{id: 2, archived: 0, order: 0}, {id: 3, archived: 1, order: 1}]);

      assert.equal(happened.tasks, 2);
      assert.equal(happened.archived_tasks, 1);

      assertElements(tasks.pluck('id'), [0, 1, 2, 3]);
      assertElements(archived_tasks.pluck('id'), [1, 3]);
      assertElements(_.pluck(tasks.models, 'cid'), ['c0', 'c1', 'c2', 'c3']);
      assertElements(_.pluck(archived_tasks.models, 'cid'), ['c1', 'c3']);
    });

    it('proxies the `remove` event', function () {
      tasks.bind('remove', inc('tasks'));
      archived_tasks.bind('remove', inc('archived_tasks'));

      tasks.remove([{id: 0}]);

      assert.equal(happened.tasks, 1);
      assert.equal(happened.archived_tasks, 0);

      assert.deepEqual(tasks.pluck('id'), [1]);
      assert.deepEqual(archived_tasks.pluck('id'), [1]);
      assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c1']);
      assert.deepEqual(_.pluck(archived_tasks.models, 'cid'), ['c1']);

      tasks.remove([{id: 1}]);

      assert.equal(happened.tasks, 2);
      assert.equal(happened.archived_tasks, 1);

      assert.deepEqual(tasks.pluck('id'), []);
      assert.deepEqual(archived_tasks.pluck('id'), []);
      assert.deepEqual(_.pluck(tasks.models, 'cid'), []);
      assert.deepEqual(_.pluck(archived_tasks.models, 'cid'), []);
    });

    it('proxies the `change` event', function () {
      happened.tasks_attr = 0;
      happened.archived_tasks_attr = 0;

      tasks.bind('change', inc('tasks'));
      archived_tasks.bind('change', inc('archived_tasks'));
      tasks.bind('change:name', inc('tasks_attr'));
      archived_tasks.bind('change:name', inc('archived_tasks_attr'));

      tasks.get(0).set({name: 'fleiba'});
      tasks.get(1).set({name: 'zemba'});

      assert.equal(happened.tasks, 2);
      assert.equal(happened.archived_tasks, 1);
      assert.equal(happened.tasks_attr, 2);
      assert.equal(happened.archived_tasks_attr, 1);

      assert.equal(tasks.get(0).get('name'), 'fleiba');
      assert.equal(tasks.get(1).get('name'), 'zemba');
      assert.equal(archived_tasks.get(1).get('name'), 'zemba');
    });

    it('proxies the `reset` event', function () {
      tasks.bind('reset', inc('tasks'));
      archived_tasks.bind('reset', inc('archived_tasks'));
      urgent_tasks.bind('reset', inc('urgent_tasks'));

      tasks.reset([ {id: 0, archived: 0, urgent: 1, order: 0}
                  , {id: 1, archived: 1, urgent: 1, order: 1}
                  , {id: 2, archived: 1, urgent: 0, order: 2}]);

      assert.equal(happened.tasks, 1);
      assert.equal(happened.archived_tasks, 1);
      assert.equal(happened.urgent_tasks, 1);

      assertElements(tasks.pluck('id'), [0, 1, 2]);
      assertElements(archived_tasks.pluck('id'), [2, 1]);
      assertElements(urgent_tasks.pluck('id'), [1, 0]);
      assertElements(_.pluck(tasks.models, 'cid'), ['c2', 'c3', 'c4']);
      assertElements(_.pluck(archived_tasks.models, 'cid'), ['c3', 'c4']);
      assertElements(_.pluck(urgent_tasks.models, 'cid'), ['c2', 'c3']);
    });

    it('proxies the `reset` event on empty responses', function () {
      tasks.bind('reset', inc('tasks'));
      archived_tasks.bind('reset', inc('archived_tasks'));

      archived_tasks.reset([]);

      assert.equal(happened.tasks, 1);
      assert.equal(happened.archived_tasks, 1);

      assert.deepEqual(tasks.pluck('id'), [0]);
      assert.deepEqual(archived_tasks.pluck('id'), []);
      assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c0']);
      assert.deepEqual(_.pluck(archived_tasks.models, 'cid'), []);
    });

    it('can be initialized with `no_reset` and does an internal reset', function () {
      tasks.bind('reset', inc('tasks'));

      archived_tasks = new Collections.ArchivedTasks([], {no_reset: true});

      assert.equal(happened.tasks, 0);

      assert.deepEqual(tasks.pluck('id'), [0, 1]);
      assert.deepEqual(archived_tasks.pluck('id'), [1]);
      assert.deepEqual(_.pluck(tasks.models, 'cid'), ['c0', 'c1']);
      assert.deepEqual(_.pluck(archived_tasks.models, 'cid'), ['c1']);
    });
  });

  describe('Live updating subset membership', function () {
    it('removes a model from the subset if the model\'s attributes change such that it\'s no longer part of the set', function () {
      tasks = new Collections.Tasks();
      archived_tasks = new Collections.ArchivedTasks(null, {liveupdate_keys: 'all'});

      tasks.reset([{id: 0, archived: 0}, {id: 1, archived: 1}, {id: 2, archived: 1}]);

      assert.equal(tasks.length, 3);
      assert.equal(archived_tasks.length, 2);

      // Update 1 so that it's not in the archived set
      tasks.get(1).set({archived: 0});
      assert.equal(tasks.length, 3);
      assert.equal(archived_tasks.length, 1);
    });

    it('adds a model to the set if the model\'s attributes change such that it should now be sieved into the set', function () {
      tasks = new Collections.Tasks();
      archived_tasks = new Collections.ArchivedTasks(null, {liveupdate_keys: 'all'});

      tasks.reset([{id: 0, archived: 0}, {id: 1, archived: 1}, {id: 2, archived: 1}]);
      assert.equal(tasks.length, 3);
      assert.equal(archived_tasks.length, 2);

      //Update 0 so that it should be in the archived set
      tasks.get(0).set({archived: 1});
      assert.equal(tasks.length, 3);
      assert.equal(archived_tasks.length, 3);
    });

    it('adds a model to the set if the model\'s attributes change such that it should now be sieved into the set', function () {
      tasks = new Collections.Tasks();
      archived_tasks = new Collections.ArchivedTasks(null, {liveupdate_keys: 'all'});

      tasks.reset([{id: 0, archived: 0}, {id: 1, archived: 1}, {id: 2, archived: 1}]);
      assert.equal(tasks.length, 3);
      assert.equal(archived_tasks.length, 2);

      //Update 0 so that it should be in the archived set
      tasks.get(0).set({archived: 1});
      assert.equal(tasks.length, 3);
      assert.equal(archived_tasks.length, 3);
    });

    it('won\'t update a subset\'s members if a key changes that is not listed in liveupdate_keys', function () {
      tasks = new Collections.Tasks();
      archived_tasks = new Collections.ArchivedTasks(null, {liveupdate_keys: ['order']});

      tasks.reset([{id: 0, archived: 0, order: 0}, {id: 1, archived: 1, order: 1}, {id: 2, archived: 1, order: 2}]);
      assert.equal(tasks.length, 3);
      assert.equal(archived_tasks.length, 2);

      //Update 0 so that it should be in the archived set, but our set won't update because it updates on 'change:order'
      tasks.get(0).set({archived: 1});
      assert.equal(tasks.length, 3);
      assert.equal(archived_tasks.length, 2);

      tasks.get(1).set({archived: 1});
      assert.equal(tasks.length, 3);
      assert.equal(archived_tasks.length, 2);
    });

    it('will update a subset\'s members if a key changes that is listed in liveupdate_keys', function () {
      tasks = new Collections.Tasks();
      archived_tasks = new Collections.ArchivedTasks(null, {liveupdate_keys: ['archived']});

      tasks.reset([{id: 0, archived: 0, order: 0}, {id: 1, archived: 1, order: 1}, {id: 2, archived: 1, order: 2}]);
      assert.equal(tasks.length, 3);
      assert.equal(archived_tasks.length, 2);

      //Update 0 so that it should be in the archived set, but our set won't update because it updates on 'change:order'
      tasks.get(0).set({archived: 1});
      assert.equal(tasks.length, 3);
      assert.equal(archived_tasks.length, 3);

      tasks.get(1).set({archived: 0});
      assert.equal(tasks.length, 3);
      assert.equal(archived_tasks.length, 2);
    });
  });
});

describe('Sieves dependant on an association', function () {
  before(function () {
    tasks.reset();
    project = new Models.Project({id: 1});
    project_tasks = new Collections.ProjectTasks([], {project: project});
  });

  it('it filters by association', function () {
    happened = {tasks: 0, project_tasks: 0};
    tasks.bind('add', inc('tasks'));
    project_tasks.bind('add', inc('project_tasks'));

    for (var i = 0; i < 4; i++) {
      project_tasks.add({id: i, project_id: i % 2, order: i});
    }

    assert.equal(happened.tasks, 4);
    assert.equal(happened.project_tasks, 2);

    assert.equal(tasks.length, 4);
    assert.equal(project_tasks.length, 2);
  });

  it('contains corrects ids', function () {
    assert.deepEqual(tasks.pluck('id'), [0, 1, 2, 3]);
    assert.deepEqual(project_tasks.pluck('id'), [1, 3]);
  });
});
