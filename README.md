## ECMAScript Private Fields ##

This proposal extends ECMAScript class syntax by introducing the following features
necessary for supporting *high-integrity classes*:

- **Private Fields** allow per-instance state which is inaccessible outside of the class
  body.
- **Nested Declarations** allow function, class, and variable declarations within the
  class body which have access to private fields.

### A Brief Introduction ###

Private fields are represented as an identifer prefixed with the `@` character.  Private
fields are lexically confined to their containing class and are not reified.  In the
following example, `@x` and `@y` are private fields whose type is guaranteed to be
**Number**.

```js
class Point {

    @x;
    @y;

    constructor(x = 0, y = 0) {
        this.@x = +x;
        this.@y = +y;
    }

    get x() { return this.@x }
    set x(value) { this.@x = +value }

    get y() { return this.@y }
    set y(value) { this.@y = +value }

    toString() { return `Point<${ this.@x },${ this.@y }>` }

}
```

In the above class, input values are converted to the **Number** type.  If we wanted
to throw an error when an invalid type is provided, we could use a *private method*.

```js
class Point {

    @x;
    @y;

    constructor(x = 0, y = 0) {
        this.@x = this.@number(x);
        this.@y = this.@number(y);
    }

    get x() { return this.@x }
    set x(value) { this.@x = this.@number(value) }

    get y() { return this.@y }
    set y(value) { this.@y = this.@number(value) }

    toString() { return `Point<${ this.@x },${ this.@y }>` }

    @number(n) {
        // Throw if `n` is not a number or is NaN
        if (+n !== n)
            throw new TypeError("Not a number");

        return n;
    }

}
```

Another example using private methods:

```js
class Container {

    @count = 0;

    // Other fields...

    clear() {
        if (this.@isEmpty())
            return;

        // Empty the container
    }

    // Other methods...

    @isEmpty() {
        return this.@count === 0;
    }
}
```

As shown in the previous example, private fields may have an initializer.  Private field
initializers are evaluated when the constructor's **this** value is initialized.

For more complete examples, see:

- [A port of V8's promise implementation](examples/Promise.js)
- [A text decoding helper for Node](examples/TextDecoder.js)


### Private State Object Model ###

#### Private Slots ####

In ECMAScript, each object has a collection of properties which are keyed
on strings and Symbols.  In addition, each object is imbued with a set of
Symbol-keyed **private slots** which are created when the object is allocated.  
The collection of private slots is not dynamic.  Private slots may not be added
or removed after the object is created.

#### Constructors and Private Slots ####

Each ECMAScript function object has an internal slot named `[[PrivateSlotList]]`
which contains a possibly-empty list of symbols which identify the private slots
that should be allocated for objects created by the function's `[[Construct]]`
behavior.

During object allocation, the `[[PrivateSlotList]]` of `new.target` is consulted
to determine the private slots which must be allocated for the new object.
Private slots are initialized to **undefined**.

`[[PrivateSlotList]]` may not contain duplicate symbols.

#### Private Slot Access ####

Private slots may be accessed by symbol.  If the object does not contain a private
slot for the provided symbol, a `TypeError` is thrown.  Unlike normal property
access, if the private slot does not exist then the prototype chain is not traversed.

Proxies do not trap private slot access.
