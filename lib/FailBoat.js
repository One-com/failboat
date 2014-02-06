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

    FailBoat.prototype.route = function () {
        throw new Error('FailBoat.route requires an error object as the first argument');
    };

    return FailBoat;
}));
