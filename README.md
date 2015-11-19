## ECMAScript Private Fields ##

### A Brief Introduction ###

Private slots are represented as an identifier prefixed with the `#` character.  Private
slot keys are lexically confined to their containing class body and are not reified.  In the
following example, `#x` and `#y` are private slots whose type is guaranteed to be
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

    equals(p) { return this.#x === p.#x && this.#y === p.#y }

    toString() { return `Point<${ this.#x },${ this.#y }>` }

}
```

Private fields may also have an initializer expression.  Private field initializers are evaluated
when the constructor's **this** value is initialized.

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

It is sometimes necessary to access private slots outside of the class body in
which they were defined.  We can accomplish this with a *static initialization block*:

```js
let areLightsOn;

class Home {
    #lightsOn = false;

    static {
        areLightsOn = home => home.#lightsOn;
    }
}

areLightsOn(new Home()); // false
```
g
### Private State Object Model ###

#### Private Slots ####

In ECMAScript, each object has a collection of properties which are keyed
on strings and Symbols.  In addition, each object is imbued with a set of
**private slots** which are created when the object is allocated. The
collection of private slots is not dynamic.  Private slots may not be added or
removed after the object is created.

Unlike normal property access, during private slot access the prototype chain
is not traversed and proxies do not trap access.

#### Constructors and Private Slots ####

Each ECMAScript function object has an internal slot named `[[PrivateSlotList]]`
which contains a possibly-empty list of keys which identify the private slots
that should be allocated for objects created by the function's `[[Construct]]`
behavior.

When a class definition is evaluated, the `[[PrivateSlotList]]` of the newly created
constructor is set to the union of the `[[PrivateSlotList]]` of the superclass (if
one exists) and the slots declared in the class being evaluated.  Each private slot
declaration creates a unique private slot key.

During object allocation, the `[[PrivateSlotList]]` of `new.target` is consulted
to determine the private slots which must be allocated for the new object.
Private slots are initialized to **undefined**.

### Syntax ###

The lexical grammar is extended with an additional token:

```
PrivateName ::
    `#` IdentifierName
```

Private field declarations are allowed within class bodies:

```
PrivateDeclaration[Yield] :
    PrivateName Initializer[Yield]?  `;`

ClassElement[Yield] :
    PrivateDeclaration
    `static` Block
    ...
```

Each private field declaration creates a lexical binding from a private name to
a unique private slot key.

If an initializer is provided, it is run immediately after the **this** value has
been bound to the new object.  In derived classes, this will occur after the super
call is evaluated.

It is a syntax error if there exists more than one class initializer block.  The
class initializer block is executed once at the end of class definition evaluation.

Member expressions are extended to allow private references:

```
MemberExpression :
    MemberExpression `.` PrivateName
    ...
```

When such a reference is evaluated, the private name is lexically resolved to a
private slot key.  The slot key is then used to access the correct private slot
on the object.

If the object does not contain the referenced private slot, then the prototype
chain is not traversed.  Instead, a TypeError is thrown.

It is an early error if a member expression contains a private name which cannot
be resolved.

### A Note on Aesthetics ###

Octothorp (`#`) looks just plain terrible here.  It would look far better to use `@` as
the leading prefix in private slot names, but `@` is currently being used by the
decorators proposal.
