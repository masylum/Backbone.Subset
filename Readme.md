# Backbone.Subset

A subset collection that contains pointers to models from a parent collection.

## Use case?

Having a collection that represents only a subset of your models.

For instance having a *Archived tasks*, you want to be sure that adding, deleting
or changing a *Task* will update that subset collection according to a given `sieve`

## How does it work?

The API is almost the same as `Backbone.Collection`.

  * You must implement a `parent` function that returns the collection the subset belongs.
  * You must implement a `sieve` function that will be used to filter the parent collection.
  * You can pass the option `{noproxy: true}` if you don't want the event to bubble from the parent to the subset.

``` javascript
Models.Task = Backbone.Model.extend({
  initialize: function () {
    this.collection = tasks;
  }
, isArchived: function () {
    return this.get('archived');
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
archivedTasks = new Collections.ArchivedTasks();

tasks.reset([{archived: true}, {archived: false}]);

assert.equal(tasks.length, 2);
assert.equal(archivedTasks.length, 1);
```

## Live Updating of subsets

Subsets can be optionally updated live. That is, if a models attributes
change such that affect it's membership of a subset, that update will
happen automatically.

By default live updating is disabled. Continuing the above example:

```
tasks.reset([{archived: true}, {archived: false}]);
archivedTasks.liveupdate_keys = 'all'

assert.equal(tasks.length, 2);
assert.equal(archivedTasks.length, 1);

tasks.first().set({archived: false});
assert.equal(tasks.length, 2);
assert.equal(archivedTasks.length, 0);
```

### Controlling live updating

Live updating is controlled by a subset's `liveupdate\_keys` attribute.

* To prevent live updating of a subset, set it's `liveupdate\_keys` attribute
to be 'none' (this is the default).
* To enable live updating when any model key changes, set
  `liveupdate\_keys = 'all'`.
* To limit which model keys trigger a live update, set `liveupdate\_keys`
to be an array of attributes: `liveupdate\_keys = ['archived']`.


## Tests

You must have node installed in order to run the tests.

```
npm install
make
```

## License

(The MIT License)

Copyright (c) 2010-2011 Pau Ramon <masylum@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
