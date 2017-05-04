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
        it('ignores calls with no arguments', function () {
            failboat.routeError = sinon.spy();
            failboat.handleError();
            expect(failboat.routeError, 'was not called');
        });

        it('fails when given an error object without tags', function () {
            expect(function () {
                failboat.handleError(new Error());
            }, 'to throw', /^Failboat.handleError requires a tagged error object as the first argument\n  Error\n    at [^\n]+Failboat.spec/);
        });

        describe('given routes', function () {
            it('is syntactic for failboat.extend(routes).handleError(err)', function () {
                var extendedFailboat = {
                    handleError: sinon.spy()
                };
                failboat.extend = sinon.stub().returns(extendedFailboat);

                var err = Failboat.tag({}, 'error');
                failboat.handleError(err, {});

                expect(extendedFailboat.handleError, 'was called with', err);
            });
        });
    });

    describe('without routes', function () {
        describe('handleError', function () {
            it('emits an errorRouted event where matchingRoute is null', function () {
                var err = Failboat.tag({}, 'error');
                failboat.handleError(err);
                expect(failboat.onErrorRouted, 'was called with', err, null);
            });

            it('returns false as the error was not handled', function () {
                var err = Failboat.tag({}, 'error');
                expect(failboat.handleError(err), 'to be false');
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

        it('should match even if the tags of an error are in a different order than the route definition', function () {
            failboat.handleError(Failboat.tag({}, '404', 'LoadMailsAction', 'FolderNotFound'));
            expect(routes['404 FolderNotFound LoadMailsAction'], 'was called once');
        });

        it('should match even if error has more tags than the most specific route', function () {
            failboat.handleError(Failboat.tag({}, '404', 'LoadMailsAction', 'FolderNotFound', 'FooBarQuux'));
            expect(routes['404 FolderNotFound LoadMailsAction'], 'was called once');
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

        describe('when a route maps to a new route', function () {
            describe('and the route exist on this failboat', function () {
                var spy, error;
                beforeEach(function () {
                    error = Failboat.tag({}, '444 MailNotFound');
                    spy = sinon.spy();
                    failboat = failboat.extend({
                        '404 MailNotFound': spy,
                        '444 MailNotFound': '404 MailNotFound'
                    });
                });
                it('route the error to the alias', function () {
                    failboat.handleError(error);
                    expect(spy, 'was called once');
                });

                it('handleError returns true as the error was handled', function () {
                    expect(failboat.handleError(error), 'to be true');
                });
            });

            describe('and the route does not exist on this failboat', function () {
                var error;
                beforeEach(function () {
                    error = Failboat.tag({}, '444 MailNotFound');
                    failboat = failboat.extend({
                        '444 MailNotFound': '404 MailNotFound'
                    });
                });

                it('route the error to the parent with the alias', function () {
                    failboat.handleError(error);
                    expect(routes['404 MailNotFound'], 'was called once');
                });

                it('handleError returns true as the error was handled', function () {
                    expect(failboat.handleError(error), 'to be true');
                });
            });
        });

        describe('errors tagged with no corresponding route', function () {
            it('emits an errorRouted event where matchingRoute is null', function () {
                var err = Failboat.tag({}, 'error');
                failboat.handleError(err);
                expect(failboat.onErrorRouted, 'was called with', err, null);
            });

            it('handleError returns false as the error was not handled', function () {
                var err = Failboat.tag({}, 'error');
                expect(failboat.handleError(err), 'to be false');
            });
        });

        describe('given an execution context', function () {
            var context;
            beforeEach(function () {
                routes =  {
                    '404 FolderNotFound': function () {
                        this.showError('Folder not found');
                    }
                };
                context = {
                    showError: sinon.spy()
                };
                failboat = new Failboat(routes, context);
            });
            it('error handlers are executed in that context', function () {
                failboat.handleError(Failboat.tag({}, '404 FolderNotFound'));
                expect(context.showError, 'was called with', 'Folder not found');
            });

            it('extending the failboat inherits the context from the parent', function () {
                expect(failboat.extend({})._context, 'to be', context);
            });
        });

        describe('extend', function () {
            var extendedRoutes, extendedFailboat;
            beforeEach(function () {
                extendedRoutes =  {
                    '404 FolderNotFound': sinon.spy(),
                    '404 ContactNotFound': sinon.spy(),
                    '409 ContactConflict': sinon.spy()
                };
                extendedFailboat = failboat.extend(extendedRoutes);
                extendedFailboat.onErrorRouted = sinon.spy();
            });

            it('creates a new failboat with parent pointer to the failboat being extended', function () {
                expect(extendedFailboat._parent, 'to be', failboat);
            });

            ['404', '404 MailNotFound'].forEach(function (tags) {
                it('route errors to the most specific route on the parent failboat for tags: ' + tags, function () {
                    extendedFailboat.handleError(Failboat.tag({}, tags));
                    expect(routes[tags], 'was called once');
                });

                it('emits an errorRouted event on the parent failboat with the matchingRoute for tags: ' + tags, function () {
                    var err = Failboat.tag({}, tags);
                    extendedFailboat.handleError(err);
                    expect(failboat.onErrorRouted, 'was called with', err, tags);
                });

                it('emits an errorRouted event on the extended failboat with the matchingRoute=null for tags: ' + tags, function () {
                    var err = Failboat.tag({}, tags);
                    extendedFailboat.handleError(err);
                    expect(extendedFailboat.onErrorRouted, 'was called with', err, null);
                });
            });

            ['404 FolderNotFound', '404 ContactNotFound', '409 ContactConflict'].forEach(function (tags) {
                it('route errors to the most specific route on the extended failboat for tags: ' + tags, function () {
                    extendedFailboat.handleError(Failboat.tag({}, tags));
                    expect(extendedRoutes[tags], 'was called once');
                });

                it('emits an errorRouted event on the extended failboat with the matchingRoute for tags: ' + tags, function () {
                    var err = Failboat.tag({}, tags);
                    extendedFailboat.handleError(err);
                    expect(extendedFailboat.onErrorRouted, 'was called with', err, tags);
                });

                it('emits an errorRouted event on the parent failboat with the matchingRoute for tags: ' + tags, function () {
                    var err = Failboat.tag({}, tags);
                    extendedFailboat.handleError(err);
                    expect(failboat.onErrorRouted, 'was called with', err, tags);
                });
            });

            it('route errors to the most specific route on the extended failboat even when there is a more specific route on the parent', function () {
                extendedFailboat.handleError(Failboat.tag({}, '404 FolderNotFound LoadMailsAction'));
                expect(extendedRoutes['404 FolderNotFound'], 'was called once');
            });

            describe('errors tagged with no corresponding route', function () {
                it('emits an errorRouted event where matchingRoute is null', function () {
                    var err = Failboat.tag({}, 'error');
                    extendedFailboat.handleError(err);
                    expect(failboat.onErrorRouted, 'was called with', err, null);
                });

                it('handleError returns false as the error was not handled', function () {
                    var err = Failboat.tag({}, 'error');
                    expect(extendedFailboat.handleError(err), 'to be false');
                });
            });
        });
    });

    describe('with a catch all route configured', function () {
        var routes, extendedFailboat;

        beforeEach(function () {
            var parentRoutes =  {
                '401': sinon.spy()
            };

            routes =  {
                '404 FolderNotFound': sinon.spy(),
                '404': sinon.spy(),
                '*': sinon.spy()
            };

            extendedFailboat = new Failboat(parentRoutes);
            extendedFailboat.onErrorRouted = sinon.spy();
            failboat = extendedFailboat.extend(routes);
            failboat.onErrorRouted = sinon.spy();
        });

        ['404', '404 FolderNotFound'].forEach(function (tags) {
            it('route errors to the most specific route for tags: ' + tags, function () {
                failboat.handleError(Failboat.tag({}, tags));
                expect(routes[tags], 'was called once');
            });

            it('emits an errorRouted event with the matchingRoute for tags: ' + tags, function () {
                var err = Failboat.tag({}, tags);
                failboat.handleError(err);
                expect(failboat.onErrorRouted, 'was called with', err, tags);
                expect(extendedFailboat.onErrorRouted, 'was called with', err, tags);
            });

            it('handleError returns true as the error was handled by a specific route for tags:' + tags, function () {
                var err = Failboat.tag({}, tags);
                expect(failboat.handleError(err), 'to be true');
            });
        });

        ['503', '401'].forEach(function (tags) {
            it('route errors to catch all route for tags: ' + tags, function () {
                failboat.handleError(Failboat.tag({}, tags));
                expect(routes['*'], 'was called once');
            });

            it('emits an errorRouted event with the matchingRoute for tags: ' + tags, function () {
                var err = Failboat.tag({}, tags);
                failboat.handleError(err);
                expect(failboat.onErrorRouted, 'was called with', err, '*');
                expect(extendedFailboat.onErrorRouted, 'was called with', err, '*');
            });

            it('handleError returns true as the error was handled by the catch all route for tags:' + tags, function () {
                var err = Failboat.tag({}, tags);
                expect(failboat.handleError(err), 'to be true');
            });
        });
    });

    describe('route syntax', function () {
        var routes;
        beforeEach(function () {
            routes =  {
                '404 FolderNotFound, 404 MailNotFound': sinon.spy()
            };
            failboat = new Failboat(routes);
            failboat.onErrorRouted = sinon.spy();
        });

        it('one key can contain multiple routes', function () {
            failboat.handleError(Failboat.tag({}, '404 FolderNotFound'));
            failboat.handleError(Failboat.tag({}, '404 MailNotFound'));
            expect(routes['404 FolderNotFound, 404 MailNotFound'], 'was called twice');
        });
    });

    describe('tag', function () {
        it('fails when the first argument is not an object', function () {
            expect(function () {
                Failboat.tag(34, 'this', 'is', 'some', 'tags');
            }, 'to throw', 'Failboat.tag requires an object as the first paramenter');
        });

        it('fails when given anything else but strings and numbers as tags', function () {
            expect(function () {
                Failboat.tag({}, 'this', null, 'some', 'tags');
            }, 'to throw', 'Failboat.tag require tags to be strings or numbers was given: "null"');
        });

        ['*', '?', 'foo*', 'bar?', 'b**', 'foo-bar'].forEach(function (tag) {
            it('fails when given a tag containing special characters: ' + tag, function () {
                expect(function () {
                    Failboat.tag({}, 'using special characters', tag);
                }, 'to throw', 'Failboat.tag require tags to be strings or numbers without special characters was given: "' + tag + '"');
            });
        });

        it('added the given tags to the error object', function () {
            var err = {};
            Failboat.tag(err, 'this', 'is', '', '    ', 'some tags');
            expect(err.tags, 'to equal', ['this', 'is', 'some', 'tags']);
        });

        it('numbers are allowed as tags', function () {
            var err = {};
            Failboat.tag(err, 0, 1, 2, 3);
            expect(err.tags, 'to equal', ['0', '1', '2', '3']);
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
