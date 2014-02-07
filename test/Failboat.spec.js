/*global describe, it, beforeEach*/
var expect = require('unexpected');
var Failboat = require('../lib/Failboat');
describe('Failboat', function () {
    var failboat;
    beforeEach(function () {
        failboat = new Failboat();
    });

    describe('handleError', function () {
        it('fails when not given an error object', function () {
            expect(function () {
                failboat.handleError();
            }, 'to throw', 'Failboat.handleError requires a tagged error object as the first argument');
        });

        it('fails when given an error object without tags', function () {
            expect(function () {
                failboat.handleError({});
            }, 'to throw', 'Failboat.handleError requires a tagged error object as the first argument');
        });
    });

    describe('tag', function () {
        it('fails when the first argument is not an object', function () {
            expect(function () {
                Failboat.tag(34, 'this', 'is', 'some', 'tags');
            }, 'to throw', 'Failboat.tag requires an object as the first paramenter');
        });

        it('fails when only less than two arguments', function () {
            expect(function () {
                Failboat.tag(34);
            }, 'to throw', 'Failboat.tag requires atleast two arguments');
        });

        it('sets the tags property on the error object to the given array of tags', function () {
            var err = {};
            Failboat.tag(err, 'this', 'is', 'some', 'tags');
            expect(err.tags, 'to equal', ['this', 'is', 'some', 'tags']);
        });
    });

    describe('without routes', function () {
        describe('handleError', function () {
            it('emits an errorRouted event', function () {
                
            });
        });
    });
});
