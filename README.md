## ECMAScript Private Fields ##

### A Brief Introduction ###

Private fields are represented as an identifier prefixed with the `#` character.  Private
fields are lexically confined to their containing class and are not reified.  In the
following example, `#x` and `#y` are private fields whose type is guaranteed to be
**Number**.

```js
class Point {

    #x;
    #y;

    constructor(x = 0, y = 0) {
        this.#x = +x;
        this.#y = +y;
    }

    get x() { return this.#x }
    set x(value) { this.#x = +value }

    get y() { return this.#y }
    set y(value) { this.#y = +value }

    toString() { return `Point<${ this.#x },${ this.#y }>` }

}
```

Private fields may also have an initializer expression.  Private field initializers are evaluated
when the constructor's **this** value is initialized.

```js
class Point {
    #x = 0;
    #y = 0;
}
```

For more complete examples, see:

- [A port of V8's promise implementation](examples/Promise.js)
- [A text decoding helper for Node](examples/TextDecoder.js)


### Private State Object Model ###

#### Private Slots ####

In ECMAScript, each object has a collection of properties which are keyed
on strings and Symbols.  In addition, each object is imbued with a set of
**private slots** which are created when the object is allocated. The
collection of private slots is not dynamic.  Private slots may not be added or
removed after the object is created.

#### Constructors and Private Slots ####

Each ECMAScript function object has an internal slot named `[[PrivateSlotList]]`
which contains a possibly-empty list of keys which identify the private slots
that should be allocated for objects created by the function's `[[Construct]]`
behavior.

During object allocation, the `[[PrivateSlotList]]` of `new.target` is consulted
to determine the private slots which must be allocated for the new object.
Private slots are initialized to **undefined**.

`[[PrivateSlotList]]` may not contain duplicate keys.

#### Private Slot Access ####

Private slots may be accessed by a lexically scoped private slot key, which may appear
in a member expression.  If the object does not contain a private slot for the provided key,
a `TypeError` is thrown.  Unlike normal property access, if the private slot does not exist then the prototype chain is not traversed.

Proxies do not trap private slot access.
