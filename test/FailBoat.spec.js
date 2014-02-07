/*global describe, it, beforeEach*/
var expect = require('unexpected');
var FailBoat = require('../lib/FailBoat');
describe('FailBoat', function () {
    var failboat;
    beforeEach(function () {
        failboat = new FailBoat();
    });

    describe('handleError', function () {
        it('fails when not given an error object', function () {
            expect(function () {
                failboat.handleError();
            }, 'to throw', 'FailBoat.handleError requires a tagged error object as the first argument');
        });

        it('fails when given an error object without tags', function () {
            expect(function () {
                failboat.handleError({});
            }, 'to throw', 'FailBoat.handleError requires a tagged error object as the first argument');
        });
    });
});
