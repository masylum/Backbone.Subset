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
  * You can pass the option `{noparent: true}` on doing an `add` or a `remove` if you don't want this action to bubble to the parent collection.

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

assert.equal(task.length, 2);
assert.equal(archivedTasks.length, 1);
```

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
