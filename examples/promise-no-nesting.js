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

    this.@chain(onResolve, onReject) {

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

        return this.@deferred();
    }

    static accept(x) {

        return this.@accepted(x);
    }

    static reject(e) {

        return this.@rejected(e);
    }

    static resolve(x) {

        return this.@isPromise(x) ? x : new this(resolve => resolve(x));
    }

    static all(values) {

        var deferred = this.@deferred(),
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

    static one(values) {

        var deferred = this.@deferred();

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

        if (!this.@isPromise(x) && IS_SPEC_OBJECT(x)) {

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
                this.@handle(value, tasks[i], tasks[i + 1]);
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
            promise.@state = RESOLVED;
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
