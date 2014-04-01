# Failboat

Failboat is the boat that transports your failures to the right
destination.

The idea is that you tag your errors with information abort the error
and the context they appeared in. This information is used to route
the error to the correct error handler.

The only requirement for routing errors to their handlers is that the
error contains a property `tags` that is a non-empty array of strings.

The routing is best explained by example.

```js
var context = {
    showError: function (message) {
        console.log(message);
    }
};

var failboat = new Failboat({
    '404 FolderNotFound': function () {
        this.showError('Folder not found');
    },
    '404': function () {
        this.showError('Generic not found handler');
    },
    '409': function () {
        this.showError('Generic conflict handler');
    },
    '502, 503': function () {
        this.showError('Could not connect to the server');
    },
    '12029': '503'
}, context);

failboat = failboat.extend({
    '401': function () {
        this.showError('Unauthorized operation');
    }
});

failboat = failboat.extend({
    '404 FolderNotFound LoadMailsAction': function (err) {
        this.showError('Folder not found while loading mails');
    }
});
```

The above code defines a failboat with three levels. The first
configuration is the base level. When a failboat is extended a new
failboat is created with the given configuration. The child failboat
will have a reference to the parent failboat.

Each error handler function is executed in the context given to the
base failboat. When extending a failboat the execution context is
inherited from the parent.

When you call `handleError` on a failboat it will try to route the
error at the top level, if it does not find an appropiate handler it
will call `handleError` on the parent failboat.

Routing an error will find the route where the words matches the
longest prefix of the tags array.

Given the example code above the following errors will result in the
output shown below:

```js
var err = Failboat.tag(new Error(), '404', 'FolderNotFound', 'LoadMailsAction');
failboat.handleError(err);
```

will print `Folder not found while loading mails` to the console.


```js
var err = Failboat.tag(new Error(), '404', 'FolderNotFound');
failboat.handleError(err);
```

will print `Folder not found` to the console.


```js
var err = Failboat.tag(new Error(), '404');
failboat.handleError(err);
```

will print `Generic not found handler` to the console.


```js
var err = Failboat.tag(new Error(), '404', 'MailNotFound', 'GetMailPartAction');
failboat.handleError(err);
```

will print `Generic not found handler` to the console.


```js
var err = Failboat.tag(new Error(), '401', 'LoadMailsAction');
failboat.handleError(err);
```

will print `Unauthorized operation` to the console.


```js
var err = Failboat.tag(new Error(), '404', 'FolderNotFound');
failboat.handleError(err);
```

will print `Folder not found` to the console.

```js
var err = Failboat.tag(new Error(), '502');
failboat.handleError(err);
```

will print `Could not connect to the server` to the console.

```js
var err = Failboat.tag(new Error(), '503');
failboat.handleError(err);
```

will print `Could not connect to the server` to the console.

```js
var err = Failboat.tag(new Error(), '12029');
failboat.handleError(err);
```

will print `Could not connect to the server` to the console.

## API

### new Failboat()

Creates a new failboat without routes.

```js
var failboat = new Failboat();
```

### new Failboat(routes)

Creates a new failboat with the given routes.

```js
var failboat = new Failboat({
    '404': function () {
        console.log('Generic not found handler');
    },
    '404 FolderNotFound': function () {
        console.log('Folder not found');
    },
    '409': function () {
        console.log('Generic conflict handler');
    }
});
```

### new Failboat(routes, context)

Creates a new failboat with the given routes. Each error handler will
be executed in the given context. If the failboat is extended the
context will be inherited.

```js
var context = {
    showError: function (message) {
        console.log(message);
    }
};

var failboat = new Failboat({
    '404': function () {
        this.showError('Generic not found handler');
    },
    '404 FolderNotFound': function () {
        this.showError('Folder not found');
    },
    '409': function () {
        this.showError('Generic conflict handler');
    }
}, context);
```

### Failboat.tag(err, tags...)

Add the given tags to the err. If the error has already been tagged
the tags will be added to the list of tags.

```js
Failboat.tag(err, 'this', 'is');
Failboat.tag(err, 'some', 'tags');
```

Now `err.tags` contains the tags `['this', 'is', 'some', 'tags']`.

### failboat.extend(routes)

Creates a new failboat with the given routes and a pointer to the
failboat that is extended.

```js
failboat = failboat.extend({
    '401': function () {
        console.log('Unauthorized operation');
    }
});
```

### failboat.handleError(err)

Routes the given error to a handler based on the configured routes and
the tags on the error.

Routing an error will find the route where the words matches the
longest prefix of the tags array. If it does not find an appropiate
handler it will delegate to it's parent failboat for handling the
error.

```js
var err = Failboat.tag(new Error(), '404', 'FolderNotFound', 'LoadMailsAction');
failboat.handleError(err);
```

### failboat.handleError(err, routes)

Syntaxtic sugar for:

```js
failboat.extend(routes).handleError(err);
```

### Event: failboat.onErrorRouted = handler

When an error has been routed an `onErrorRouted` will be called with
the error and the matching route. That gives you the posibility to do
logging and crash reporting in a central place.

The `onErrorRouted` will be called for each failboat where a handler
has been attached. Usually the `onErrorRouted` handler should be
attached to the base failboat.

```js
failboat.onErrorRouted = function (err, matchingRoute) {
    if (matchingRoute) {
        console.log('Error: "' + err.message + '" handled by ' + matchingRoute);
        if (500 <= err.status && err.status < 600) {
            // Report server crash
        }
    } else {
        console.log('Missing handler for: "' + err.message + '"');
    }
};
```
