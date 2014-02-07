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
    function Failboat() {
        this.eventHandlers = {};
    }

    Failboat.prototype.handleError = function (err) {
        if (!err || !Array.isArray(err.tags)) {
            throw new Error('Failboat.handleError requires a tagged error object as the first argument');
        }
        this.emit('errorRouted', err, null);
    };

    Failboat.prototype.on = function (eventType, handler) {
        var handlerList = this.eventHandlers[eventType] = this.eventHandlers[eventType] || [];
        handlerList.push(handler);
    };

    Failboat.prototype.emit = function (eventType) {
        var args = Array.prototype.slice.call(arguments, 1);
        (this.eventHandlers[eventType] || []).forEach(function (handler) {
            handler.apply(null, args);
        });
    };

    Failboat.tag = function (err) {
        var tags = Array.prototype.slice.call(arguments, 1);
        if (err === null || typeof err !== 'object') {
            throw new Error('Failboat.tag requires an object as the first paramenter');
        }

        tags.forEach(function (tag) {
            if (typeof tag !== 'string') {
                throw new Error('Failboat.tag require tags to be strings was given: "' + tag + '"');
            }
        });

        err.tags = (err.tags || []).concat(tags);
        return err;
    };

    return Failboat;
}));
