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

    function score(err, route) {
        var routeSegments = route.split(' ');
        if (routeSegments.length > err.tags.length) {
            return 0;
        }

        var matching = routeSegments.every(function (routeSegment, index) {
            return err.tags[index] === routeSegment;
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

    Failboat.prototype.handleError = function (err, routes) {
        if (routes) {
            return this.extend(routes).handleError(err);
        }

        if (!err || !Array.isArray(err.tags)) {
            throw new Error('Failboat.handleError requires a tagged error object as the first argument');
        }

        var matchingRoute = null;

        var routesWithScore = Object.keys(this.routes).map(function (route) {
            return {
                score: score(err, route),
                route: route
            };
        }).filter(function (routeWithScore) {
            return routeWithScore.score > 0;
        });

        if (routesWithScore.length > 0) {
            matchingRoute = maxBy(routesWithScore, 'score').route;
            this.routes[matchingRoute].call(this._context, err);
        }

        if (matchingRoute) {
            this.convoy().forEach(function (failboat) {
                failboat.emitErrorRouted(err, matchingRoute);
            });
        } else {
            this.emitErrorRouted(err, matchingRoute);
            if (this._parent) {
                this._parent.handleError(err);
            }
        }

        return this;
    };

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

        err.tags = (err.tags || []).concat(tags);
        return err;
    };

    Failboat.prototype.extend = function (routes) {
        return new Failboat(routes, this._context, this);
    };

    return Failboat;
}));
