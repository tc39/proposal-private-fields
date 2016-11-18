The purpose of this document is to outline a possible path for further evolution of the private state proposal. The idea is to make sure that this proposal is consistent with the described evolution path, but to keep these additional features for follow-on proposals.

## Strawman private methods outline

Private methods are a natural next step for privacy in ECMAScript classes. One may imagine private methods looking like this:

```js
class Foo {
  #a;
  #b;
  #sum() { return #a + #b; }
  printSum() { console.log(#sum()); }
  constructor(a, b) { #a = a; #b = b; }
}
let f = new Foo(1, 2);
f.printSum();  // prints 3
```

I believe we can make this Just Work(TM).

The key is how to allow private state fields and private methods work side-by-side. Syntax like `#sum()` would seem ambiguous: is this looking up the `#sum` private field and then calling it, or is it calling a method (on the prototype???) which is private called `#sum`.

This document describes two alternative ways of defining the semantics to describe how this would be specified, with minimal observable differences.

### Option 1: Private methods are just immutable own private fields which are functions

Imagine that the above method definition is simply syntactic sugar for

```js
class Foo {
  #a; #b;
  #sum = function() { return #a + #b; };
}
```

This would work out for the rest of the code sample just fine: The receiver for a call like `#sum()` would be the local lexical `this`, just like in a normal method call.

However, from an implementation efficiency point of view, there is a problem: the addition of an own, mutable private field means that implementations may have to actually allocate storage space for the property.

In the spirit of private state being generally stricter, and to reduce that potential source of slowdown, this proposal would make the property immutable. Then, implementations can deterministically optimize away its storage to make that simply a reference to a particular function, based on which class it is contained in.

Looking up which function is relevant would be part of the work implementations already have to do for scoping, wherein, for example, implementations also have to determine which class the private field corresponds to. If [private state is not visible within eval](https://github.com/tc39/proposal-private-fields/issues/47), the implementation is simpler, but it is possible to do either way.

### Option 2: Private method references are a different type, resolved lexically

In this option, there would be an additional reference type which is introduced to describe private methods. In the `GetValue` internal algorithm, we have the following new steps:

        1. If IsPrivateReference(_V_), then
          1. Let _privateMap_ be ? ResolveBinding(GetReferencedName(_V_)).
          1. Assert: _privateMap_ is a WeakMap object.
          1. If WeakMapHas(_privateMap_, _base_) is *false*, throw a *TypeError* exception.
          1. Return ! WeakMapGet(_privateMap_, _base_).

Instead of assuming the value is a `WeakMap`, we could make two options: either it is a WeakMap, or it is a method. If it's a method, then treat this like a method invocation.

Again, as with the previous semantics, this would be easier to implement without direct `eval` being able to see private data, but it is possible either way.
