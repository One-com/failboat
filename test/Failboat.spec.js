/*global describe, it, beforeEach*/
var expect = require('unexpected');
expect.installPlugin(require('unexpected-sinon'));
var sinon = require('sinon');
var Failboat = require('../lib/Failboat');

describe('Failboat', function () {
    var failboat;
    beforeEach(function () {
        failboat = new Failboat();
        failboat.onErrorRouted = sinon.spy();
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
            it('emits an errorRouted event where matchingRoute is null', function () {
                var err = Failboat.tag({}, 'error');
                failboat.handleError(err);
                expect(failboat.onErrorRouted, 'was called with', err, null);
            });
        });
    });

    describe('with routes configured', function () {
        var routes;
        beforeEach(function () {
            routes =  {
                '404 FolderNotFound': sinon.spy(),
                '404 MailNotFound': sinon.spy(),
                '404 FolderNotFound LoadMailsAction': sinon.spy(),
                '404': sinon.spy()
            };
            failboat = new Failboat(routes);
            failboat.onErrorRouted = sinon.spy();
        });

        ['404', '404 FolderNotFound', '404 FolderNotFound LoadMailsAction', '404 MailNotFound'].forEach(function (tags) {
            it('route errors to the most specific route for tags: ' + tags, function () {
                failboat.handleError(Failboat.tag({}, tags));
                expect(routes[tags], 'was called once');
            });
            
            it('emits an errorRouted event with the matchingRoute for tags: ' + tags, function () {
                var err = Failboat.tag({}, tags);
                failboat.handleError(err);
                expect(failboat.onErrorRouted, 'was called with', err, tags);
            });
        });

        it('tags with no corresponding route emits an errorRouted event where matchingRoute is null', function () {
            var err = Failboat.tag({}, 'error');
            failboat.handleError(err);
            expect(failboat.onErrorRouted, 'was called with', err, null);
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
            Failboat.tag(err, 'this', 'is', 'some tags');
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
