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
    function FailBoat() {
        
    }

    FailBoat.prototype.handleError = function () {
        throw new Error('FailBoat.handleError requires a tagged error object as the first argument');
    };

    return FailBoat;
}));
