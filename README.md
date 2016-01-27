## ECMAScript Private Fields

### A Brief Introduction

Private field names are represented as an identifier prefixed with the `#` character.  Private field definitions create immutable bindings which are lexically confined to their containing class body and are not reified.  In the following example, `#x` and `#y` are private slots whose type is guaranteed to be **Number**.

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

    equals(p) { return this.#x === p.#x && this.#y === p.#y }

    toString() { return `Point<${ this.#x },${ this.#y }>` }

}
```

Private fields may also have an initializer expression.  Private field initializers are evaluated when the constructor's **this** value is initialized.

```js
class Point {
    #x = 0;
    #y = 0;

    constructor() {
        this.#x; // 0
        this.#y; // 0
    }
}
```

### Private State Object Model

#### Internal Slots

In ECMAScript, each object has a collection of properties which are keyed on strings and Symbols.  In addition, each object may have a set of **internal slots** which can hold any ECMAScript value. Internal slots are added to objects dynamically during object construction. There is no facility for removing internal slots from an object.

Unlike normal property access, during internal slot access the prototype chain is not traversed and proxies do not trap access.

#### Constructors and Internal Slots

Each ECMAScript function object has an internal slot named `[[InstanceSlots]]` which contains a possibly-empty list of keys which identify the internal slots that should be added to objects during construction.

When a class definition is evaluated, the `[[InstanceSlots]]` of the newly created constructor an internal slot key for each private name definition within the class body.  The constructor adds these internal slots to objects in the following situations:

1. For a base class, when the object is allocated.
1. For a derived class, when the super call returns.

### Syntax

The lexical grammar is extended with an additional token:

```
PrivateName ::
    `#` IdentifierPart
    PrivateName IdentifierPart
```

Private field definitions are allowed within class bodies:

```
PrivateFieldDefinition[Yield] :
    PrivateName Initializer[In, ?Yield]? `;`

ClassElement[Yield] :
    ...
    PrivateFieldDefinition[?Yield]
```

Each private field definition creates a lexical binding from a private name to a unique internal slot key.

If an initializer is provided, it is run immediately after the **this** value has been bound to the new object.  In derived classes, this will occur after the super call is evaluated.

It is a syntax error if there are any duplicate private field definitions.

Member expressions are extended to allow private references:

```
MemberExpression[Yield] :
    ...
    MemberExpression[?Yield] `.` PrivateName
```

When such a reference is evaluated, the private name is lexically resolved to an internal slot key.  The slot key is then used to access the correct internal slot on the object.

If the object does not contain the referenced internal slot, then the prototype chain is not traversed.  Instead, a TypeError is thrown.

It is an early error if a member expression contains a private name which cannot be statically resolved.

### Frequently Asked Questions ###

- [Why do we have to use a special character in front of the identifier?](https://github.com/zenparsing/es-private-fields/issues/14)
- [Why not use a private version of Symbols?](https://github.com/zenparsing/es-abstract-refs/issues/11)
