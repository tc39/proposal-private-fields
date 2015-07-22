(function() { "use strict";

// Find global variable and exit if Promise is defined on it

var Global = (function() {
    if (typeof window !== "undefined" && window && window.window === window)
        return window;
    if (typeof global !== "undefined" && global && global.global === global)
        return global;
    throw new Error("Unable to determine global object");
})();

if (typeof Global.Promise === "function")
    return;

// Create an efficient microtask queueing mechanism

var runLater = (function() {
    // Node
    if (Global.process && typeof process.version === "string") {
        return Global.setImmediate ?
            function(fn) { setImmediate(fn); } :
            function(fn) { process.nextTick(fn); };
    }

    // Newish Browsers
    var Observer = Global.MutationObserver || Global.WebKitMutationObserver;

    if (Observer) {
        var div = document.createElement("div"),
            queuedFn = void 0;

        var observer = new Observer(function() {
            var fn = queuedFn;
            queuedFn = void 0;
            fn();
        });

        observer.observe(div, { attributes: true });

        return function(fn) {
            if (queuedFn !== void 0)
                throw new Error("Only one function can be queued at a time");
            queuedFn = fn;
            div.classList.toggle("x");
        };
    }

    // Fallback
    return function(fn) { setTimeout(fn, 0); };
})();

var EnqueueMicrotask = (function() {
    var queue = null;

    function flush() {
        var q = queue;
        queue = null;
        for (var i = 0; i < q.length; ++i)
            q[i]();
    }

    return function PromiseEnqueueMicrotask(fn) {
        // fn must not throw
        if (!queue) {
            queue = [];
            runLater(flush);
        }
        queue.push(fn);
    };
})();

// Mock V8 internal functions and vars

function SET_PRIVATE(obj, prop, val) { obj[prop] = val; }
function GET_PRIVATE(obj, prop) { return obj[prop]; }
function IS_SPEC_FUNCTION(obj) { return typeof obj === "function"; }
function IS_SPEC_OBJECT(obj) { return obj === Object(obj); }
function HAS_DEFINED_PRIVATE(obj, prop) { return prop in obj; }
function IS_UNDEFINED(x) { return x === void 0; }
function MakeTypeError(msg) { return new TypeError(msg); }

// In IE8 Object.defineProperty only works on DOM nodes, and defineProperties does not exist
var _defineProperty = Object.defineProperties && Object.defineProperty;

function AddNamedProperty(target, name, value) {
    if (!_defineProperty) {
        target[name] = value;
        return;
    }

    _defineProperty(target, name, {
        configurable: true,
        writable: true,
        enumerable: false,
        value: value
    });
}

function InstallFunctions(target, attr, list) {
    for (var i = 0; i < list.length; i += 2)
        AddNamedProperty(target, list[i], list[i + 1]);
}

var IsArray = Array.isArray || (function(obj) {
    var str = Object.prototype.toString;
    return function(obj) { return str.call(obj) === "[object Array]" };
})();

var UNDEFINED, DONT_ENUM, InternalArray = Array;

const OPTIMIZED = {};
const PENDING = 0;
const RESOLVED = +1;
const REJECTED = -1;

function idResolveHandler(x) { return x }
function idRejectHandler(r) { throw r }
function noopResolver() { }

class Promise {

    @status = PENDING;
    @value;
    @onResolve;
    @onReject;
    @hasHandler = false;

    constructor(resolver) {

        // Optimized case to avoid creating an uneccessary closure.  Creator assumes
        // responsibility for setting initial state.
        if (resolver === OPTIMIZED)
            return;

        if (!IS_SPEC_FUNCTION(resolver))
            throw MakeTypeError('resolver_not_a_function', [resolver]);

        this.@onResolve = new InternalArray;
        this.@onReject = new InternalArray;

        try { resolver(x => { this.@resolve(x) }, r => { this.@reject(r) }) }
        catch (e) { this.@reject(e) }
    }

    chain(onResolve, onReject) {

        return this.@chain(onResolve, onReject);
    }

    then(onResolve, onReject) {

        onResolve = IS_SPEC_FUNCTION(onResolve) ? onResolve : idResolveHandler;
        onReject = IS_SPEC_FUNCTION(onReject) ? onReject : idRejectHandler;

        var constructor = this.constructor;

        return this.@chain(x => {

            x = Promise.@coerce(constructor, x);

            return x === this ? onReject(MakeTypeError('promise_cyclic', [x])) :
                Promise.@isPromise(x) ? x.then(onResolve, onReject) :
                onResolve(x);

        }, onReject);
    }

    catch(onReject) {

        return this.then(void 0, onReject);
    }

    @chain(onResolve, onReject) {

        onResolve = IS_UNDEFINED(onResolve) ? idResolveHandler : onResolve;
        onReject = IS_UNDEFINED(onReject) ? idRejectHandler : onReject;

        var deferred = this.constructor.@deferred();

        switch (this.@status) {

            case PENDING:
                this.@onResolve.push(onResolve, deferred);
                this.@onReject.push(onReject, deferred);
                break;

            case RESOLVED:  // Resolved
                Promise.@enqueue(this.@value, [onResolve, deferred], RESOLVED);
                break;

            case REJECTED:  // Rejected
                Promise.@enqueue(this.@value, [onReject, deferred], REJECTED);
                break;
        }

        // Mark this promise as having handler.
        this.@hasHandler = true;

        return deferred.promise;
    }

    @resolve(x) {

        this.@done(RESOLVED, x, this.@onResolve);
    }

    @reject(r) {

        this.@done(REJECTED, r, this.@onReject);
    }

    @done(status, value, queue) {

        if (this.@status === PENDING) {

            this.@status = status;
            this.@value = value;

            Promise.@enqueue(value, queue, status);
        }
    }

    static defer() {

        return Promise.@deferred();
    }

    static accept(x) {

        return Promise.@accepted(x);
    }

    static reject(e) {

        return Promise.@rejected(e);
    }

    static resolve(x) {

        return Promise.@isPromise(x) ? x : new this(resolve => resolve(x));
    }

    static all(values) {

        var deferred = Promise.@deferred(),
            resolutions = [];

        if (!IsArray(values)) {

            deferred.reject(MakeTypeError('invalid_argument'));
            return deferred.promise;
        }

        function makeResolver(i) {

            return x => {

                resolutions[i] = x;

                if (--count === 0)
                    deferred.resolve(resolutions);
            };
        }

        try {

            var count = values.length;

            if (count === 0) {

                deferred.resolve(resolutions);

            } else {

                for (var i = 0; i < values.length; ++i) {

                    this.resolve(values[i]).then(
                        makeResolver(i),
                        deferred.reject);
                }
            }

        } catch (e) {

            deferred.reject(e);
        }

        return deferred.promise;
    }

    static race(values) {

        var deferred = Promise.@deferred();

        if (!IsArray(values)) {

            deferred.reject(MakeTypeError('invalid_argument'));
            return deferred.promise;
        }

        try {

            for (var i = 0; i < values.length; ++i) {

                this.resolve(values[i]).then(
                    deferred.resolve,
                    deferred.reject);
            }

        } catch (e) {

            deferred.reject(e);
        }

        return deferred.promise;
    }

    static @coerce(constructor, x) {

        if (!Promise.@isPromise(x) && IS_SPEC_OBJECT(x)) {

            var then;

            try { then = x.then }
            catch(r) { return constructor.@rejected(r) }

            if (IS_SPEC_FUNCTION(then)) {

                var deferred = constructor.@deferred();

                try { then.call(x, deferred.resolve, deferred.reject) }
                catch(r) { deferred.reject(r) }

                return deferred.promise;
            }
        }

        return x;
    }

    static @enqueue(value, tasks, status) {

        EnqueueMicrotask(_=> {

            for (var i = 0; i < tasks.length; i += 2)
                Promise.@handle(value, tasks[i], tasks[i + 1]);
        });
    }

    static @handle(value, handler, deferred) {

        try {

            var result = handler(value);

            if (result === deferred.promise)
                throw MakeTypeError('promise_cyclic', [result]);
            else if (Promise.@isPromise(result))
                result.@chain(deferred.resolve, deferred.reject);
            else
                deferred.resolve(result);

        } catch (e) {

            try { deferred.reject(e) }
            catch (e) { }
        }
    }

    static @isPromise(x) {

        try { return x.@status !== void 0 }
        catch (e) { return false }
    }

    static @deferred() {

        if (this === Promise) {

            var promise = new Promise(OPTIMIZED);

            promise.@onResolve = new InternalArray;
            promise.@onReject = new InternalArray;

            return {

                promise: promise,
                resolve: x => { promise.@resolve(x) },
                reject: r => { promise.@reject(r) },
            };

        } else {

            var result = {};

            result.promise = new this((resolve, reject) => {

                result.resolve = resolve;
                result.reject = reject;
            });

            return result;
        }
    }

    static @accepted(x) {

        if (this === Promise) {

            var promise = new Promise(OPTIMIZED);
            promise.@status = RESOLVED;
            promise.@value = x;
            return promise;
        }

        return new this(resolve => resolve(x));
    }

    static @rejected(r) {

        if (this === Promise) {

            var promise = new Promise(OPTIMIZED);
            promise.@status = REJECTED;
            promise.@value = r;
            return promise;
        }

        return new this((resolve, reject) => reject(r));
    }

}

AddNamedProperty(Global, 'Promise', Promise, DONT_ENUM);

})();
