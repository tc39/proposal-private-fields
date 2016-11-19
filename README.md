## ECMAScript Private Fields

### A Brief Introduction

Private field names are represented as an identifier prefixed with the `#` character.  Private field definitions create immutable bindings which are lexically confined to their containing class body and are not reified.  In the following example, `#x` and `#y` identify private fields whose type is guaranteed to be **Number**.

```js
class Point {

    #x;
    #y;

    constructor(x = 0, y = 0) {
        #x = +x;
        #y = +y;
    }

    get x() { return #x }
    set x(value) { #x = +value }

    get y() { return #y }
    set y(value) { #y = +value }

    equals(p) { return #x === p.#x && #y === p.#y }

    toString() { return `Point<${ #x },${ #y }>` }

}
```

Private fields may also have an initializer expression.  Private field initializers are evaluated when the constructor's **this** value is initialized.

```js
class Point {
    #x = 0;
    #y = 0;

    constructor() {
        #x; // 0
        #y; // 0
    }
}
```

### Private State Object Model

#### WeakMaps

Each field definition creates a unique WeakMap object, whose keys are instances of the class which contains the field definition.  Private field WeakMaps cannot be accessed directly by user code.

#### Constructors and Field Initialization

Each ECMAScript function object has an internal slot named `[[PrivateFields]]` which contains a possibly-empty list of WeakMaps and initializer expressions.  When a class definition is evaluated, the `[[PrivateFields]]` list of the newly created constructor is populated with a WeakMap for each private name definition within the class body.  The constructor adds entries to each WeakMap in this list at the following times:

1. For a base class, after the new object is allocated.
1. For a derived class, immediately after the super call returns.

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

Each private field definition creates a lexical binding from a private name to a private field WeakMap.

If an initializer is provided, it is run immediately before the **this** value has been bound to the new object.  In derived classes, this will occur after the super call is evaluated.

It is a syntax error if there are any duplicate private field definitions.

Member expressions are extended to allow private references:

```
MemberExpression[Yield] :
    ...
    MemberExpression[?Yield] `.` PrivateName
```

A concise member expression syntax also exists, where `#x` is shorthand for `this.#x`.

When such a reference is evaluated, the private name is lexically resolved to a private field WeakMap.  The WeakMap is then used to access the field data associated with the object.

If the WeakMap does not contain an entry for the object a TypeError is thrown.

It is an early error if a member expression contains a private name which cannot be statically resolved.

### Frequently Asked Questions ###

- [Why do we have to use a special character in front of the identifier?](https://github.com/zenparsing/es-private-fields/issues/14)
- [Why not use a private version of Symbols?](https://github.com/zenparsing/es-abstract-refs/issues/11)
