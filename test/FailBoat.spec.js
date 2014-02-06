/*global describe, it, beforeEach*/
var expect = require('unexpected');
var FailBoat = require('../lib/FailBoat');
describe('FailBoat', function () {
    var errorHandler;
    beforeEach(function () {
        errorHandler = new FailBoat();
    });

    describe('route', function () {
        it('fails when not given an error object', function () {
            expect(function () {
                errorHandler.route();
            }, 'to throw', 'FailBoat.route requires an error object as the first argument');
        });
    });
});
