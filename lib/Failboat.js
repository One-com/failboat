(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.com = root.com || {};
        root.com.one = root.com.one || {};
        root.com.one.FailBoat = factory();
    }
}(this, function () {
    function Failboat(routes, context, parent) {
        this.routes = Object.keys(routes || {}).reduce(function (result, key) {
            var handler = routes[key];
            key.split(/\s*,\s*/).forEach(function (route) {
                result[route] = handler;
            });
            return result;
        }, {});

        this._context = context || {};
        this._parent = parent || null;
    }

    function score(tags, route) {
        var routeSegments = route.split(' ');
        if (routeSegments.length > tags.length) {
            return 0;
        }

        var matching = routeSegments.every(function (routeSegment) {
            return tags.indexOf(routeSegment) !== -1;
        });

        return matching ? routeSegments.length : 0;
    }

    function maxBy(arr, selector) {
        return arr.reduce(function (max, current) {
            return max[selector] < current[selector] ?
                current : max;
        });
    }

    Failboat.prototype.emitErrorRouted = function (err, matchingRoute) {
        if (this.onErrorRouted) {
            this.onErrorRouted.call(this._context, err, matchingRoute);
        }
    };

    Failboat.prototype.parents = function () {
        var parent = this._parent;
        return parent ? [parent].concat(parent.parents()) : [];
    };

    Failboat.prototype.convoy = function () {
        return [this].concat(this.parents());
    };

    Failboat.prototype.routeError = function (tags, err) {
        var matchingRoute = null;

        var routesWithScore = Object.keys(this.routes).map(function (route) {
            return {
                score: score(tags, route),
                route: route
            };
        }).filter(function (routeWithScore) {
            return routeWithScore.score > 0;
        });

        if (routesWithScore.length > 0) {
            matchingRoute = maxBy(routesWithScore, 'score').route;
        } else if ('*' in this.routes) {
            matchingRoute = '*';
        }

        if (matchingRoute) {
            var handler = this.routes[matchingRoute];
            if (typeof handler === 'string') {
                var alias = handler;
                return this.routeError(alias.split(' '), err);
            } else {
                handler.call(this._context, err);
            }

            this.convoy().forEach(function (failboat) {
                failboat.emitErrorRouted(err, matchingRoute);
            });

            return true;
        } else {
            this.emitErrorRouted(err, matchingRoute);
            if (this._parent) {
                return this._parent.routeError(tags, err);
            } else {
                return false;
            }
        }
    };

    Failboat.prototype.handleError = function (err, routes) {
        if (routes) {
            return this.extend(routes).handleError(err);
        }

        if (!err) { // ignore
            return this;
        }

        if (!Array.isArray(err.tags)) {
            var message = 'Failboat.handleError requires a tagged error object as the first argument';
            if (err.stack) {
                message += '\n' + (err.stack || '').replace(/^/g, '  ');
            }
            throw new Error(message);
        }

        return this.routeError(err.tags, err);
    };

    var tagRegexp = /^\w+$/;
    Failboat.tag = function (err) {
        if (err === null || typeof err !== 'object') {
            throw new Error('Failboat.tag requires an object as the first paramenter');
        }
        var tags = Array.prototype.slice.call(arguments, 1);

        tags.forEach(function (tag) {
            var type = typeof tag;
            if (type !== 'string' && type !== 'number') {
                throw new Error('Failboat.tag require tags to be strings or numbers was given: "' + tag + '"');
            }
        });

        tags = tags.map(function (tag) {
            return '' + tag;
        }).reduce(function (tags, tag) {
            return tags.concat(tag.split(' '));
        }, []).filter(function (tag) {
            return tag.length > 0;
        });

        tags.forEach(function (tag) {
            if (!tag.match(tagRegexp)) {
                throw new Error('Failboat.tag require tags to be strings or numbers without special characters was given: "' + tag + '"');
            }
        });

        err.tags = (err.tags || []).concat(tags);
        return err;
    };

    Failboat.prototype.extend = function (routes) {
        return new Failboat(routes, this._context, this);
    };

    return Failboat;
}));
