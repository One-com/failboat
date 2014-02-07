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
        
    }

    Failboat.prototype.handleError = function () {
        throw new Error('Failboat.handleError requires a tagged error object as the first argument');
    };

    Failboat.tag = function (err) {
        if (arguments.length < 2) {
            throw new Error('Failboat.tag requires atleast two arguments');
        }

        var args = Array.prototype.slice.call(arguments, 1);
        if (err === null || typeof err !== 'object') {
            throw new Error('Failboat.tag requires an object as the first paramenter');
        }

        err.tags = args;
    };

    return Failboat;
}));
