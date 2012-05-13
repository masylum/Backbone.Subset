/*global it, describe, before, beforeEach*/
var _ = require('underscore')
  , Models = {}
  , Collections = {}

  // instances
  , tasks, archived_tasks, urgent_tasks, project, project_tasks;

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
});

Collections.ArchivedTasks = Backbone.Subset.extend({
  parent: function () {
    return tasks;
  }
, name: 'ArchivedTasks'
, sieve: function (task) {
    return task.isArchived();
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
    } else {
      return false;
    }
  }
});

tasks = new Collections.Tasks();
archived_tasks = new Collections.ArchivedTasks();
urgent_tasks = new Collections.UrgentTasks();
project = new Models.Project({id: 1});
project_tasks = new Collections.ProjectTasks([], {project: project});

// Add intial state
(function () {
  var start = Date.now(), end, i;

  for (i = 0; i < 5000; i++) {
    tasks.add({id: i, archived: i % 2, urgent: 0, order: i});
  }

  end = Date.now();

  console.log('[bench] Add intial state: ' + (end - start));
  console.log(tasks.length, archived_tasks.length, urgent_tasks.length, project_tasks.length);
}());

// Reset urgents
(function () {
  var start = Date.now()
    , urgents = []
    , end, i;

  for (i = 5000; i < 10000; i++) {
    urgents.push({id: i, archived: i % 2, urgent: 1, order: i, project_id: i % 2});
  }

  urgent_tasks.reset(urgents);
  end = Date.now();

  console.log('[bench] Resets urgents: ' + (end - start));
  console.log(tasks.length, archived_tasks.length, urgent_tasks.length, project_tasks.length);
}());

// Removes project_tasks
(function () {
  var start = Date.now()
    , end, i;

  project_tasks.reset([]);

  end = Date.now();

  console.log('[bench] Removes project_tasks: ' + (end - start));
  console.log(tasks.length, archived_tasks.length, urgent_tasks.length, project_tasks.length);
}());
