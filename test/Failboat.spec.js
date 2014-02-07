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

    describe('without routes', function () {
        describe('handleError', function () {
            it('emits an errorRouted event where matchingRoute is null', function (done) {
                var err = Failboat.tag({}, 'error');
                failboat.on('errorRouted', function (err, matchingRoute) {
                    expect(matchingRoute, 'to be null');
                    done();
                });
                failboat.handleError(err);
            });
        });
    });

    describe('tag', function () {
        it('fails when the first argument is not an object', function () {
            expect(function () {
                Failboat.tag(34, 'this', 'is', 'some', 'tags');
            }, 'to throw', 'Failboat.tag requires an object as the first paramenter');
        });

        it('fails when given anything else but strings as tags', function () {
            expect(function () {
                Failboat.tag({}, 'this', null, 'some', 'tags');
            }, 'to throw', 'Failboat.tag require tags to be strings was given: "null"');
        });

        it('added the given tags to the error object', function () {
            var err = {};
            Failboat.tag(err, 'this', 'is', 'some', 'tags');
            expect(err.tags, 'to equal', ['this', 'is', 'some', 'tags']);
        });
        
        describe('on an error object that has already been tagged', function () {
            var err = {};
            beforeEach(function () {
                Failboat.tag(err, 'this', 'is');
            });

            it('appends the tags to the tags list', function () {
                Failboat.tag(err, 'some', 'tags');
                expect(err.tags, 'to equal', ['this', 'is', 'some', 'tags']);
            });
        });
    });
});
