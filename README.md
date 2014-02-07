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
var failboat = new Failboat({
    '404 FolderNotFound': function () {
        console.log('Folder not found');
    },
    '404': function () {
        console.log('Generic not found handler');
    },
    '409': function () {
        console.log('Generic conflict handler');
    }
});

failboat = failboat.extend({
    '401': function () {
        console.log('Unauthorized operation');
    }
});

failboat = failboat.extend({
    '404 FolderNotFound LoadMailsAction': function (err) {
        console.log('Folder not found while loading mails');
    }
});
```

The above code defines a failboat with three levels. The first
configuration is the base level. When a failboat is extended a new
failboat is created with the given configuration. The child failboat
will have a reference to the parent failboat.

When you call `handleError` on a failboat it will try to route the
error at the top level, if it does not find an appropiate handler it
will call `handleError` on the parent failboat.

Routing an error will go through the handlers in the order
they are specified and pick the first handler where all the words of
the key is contained in the tags array on the error.

Given the example code above the following errors will result in the
output shown below:

```js
var err = Failboat.tag(new Error(), ['404', 'FolderNotFound', 'LoadMailsAction']);
failboat.handleError(err);
```
will print `Folder not found while loading mails` to the console.


```js
var err = Failboat.tag(new Error(), ['404', 'FolderNotFound']);
failboat.handleError(err);
```
will print `Folder not found` to the console.


```js
var err = Failboat.tag(new Error(), ['404']);
failboat.handleError(err);
```
will print `Generic not found handler` to the console.


```js
var err = Failboat.tag(new Error(), ['404', 'MailNotFound', 'GetMailPartAction']);
failboat.handleError(err);
```
will print `Generic not found handler` to the console.


```js
var err = Failboat.tag(new Error(), ['404', 'LoadMails']);
failboat.handleError(err);
```
will print `Unauthorized operation` to the console.


```js
var err = Failboat.tag(new Error(), ['404', 'FolderNotFound', 'LoadMailsAction']);
failboat.handleError(err);
```
will print `Folder not found while loading mails` to the console.


```js
var err = Failboat.tag(new Error(), ['404', 'FolderNotFound']);
failboat.handleError(err);
```
will print `Folder not found` to the console.

## API

### new Failboat(routes)

Creates a new failboat with the given routes.

```js
var failboat = new Failboat({
    '404 FolderNotFound': function () {
        console.log('Folder not found');
    },
    '404': function () {
        console.log('Generic not found handler');
    },
    '409': function () {
        console.log('Generic conflict handler');
    }
});
```

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

Routing an error will go through the handlers in the order they are
specified and pick the first handler where all the words of the key is
contained in the tags array on the error. If it does not find an
appropiate handler it will delegate to it's parent failboat for
handling the error.

```js
var err = Failboat.tag(new Error(), ['404', 'FolderNotFound', 'LoadMailsAction']);
failboat.handleError(err);
```

### failboat.handleError(err, routes)

Syntaxtic sugar for:

```js
failboat.extend(routes).handleError(err);
```

### Event: failboat.on('errorRouted', handler);

Attaches a handler for the given . 

When an error has been routed a `errorRouted` event will be
emitted. That gives you the posibility to do logging and crash
reporting in a central place.

When you extend a failboat it shares the event bus with the parent
failboat. That means it does not matter at which level you attach your
event handlers.

```js
failboat.on('routing', function (err, matchingRoute) {
    if (matchingRoute) {
        console.log('Error: "' + err.message + '" handled by ' + matchingRoute);
        if (500 <= err.status && err.status < 600) {
            // Report server crash
        }
    } else {
        console.log('Missing handler for: "' + err.message + '"');
    }
});
```
