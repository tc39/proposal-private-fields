## ECMAScript Private Fields ##

This proposal extends ECMAScript by introducing *private fields* and other features
necessary for supporting *high-integrity classes*.

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
        @x = +x;
        @y = +y;
    }

    get x() { return @x }
    set x(value) { @x = +value }

    get y() { return @y }
    set y(value) { @y = +value }

    toString() { return `Point<${ this.@x },${ this.@y }>` }

}
```

In the above class, input values are converted to the **Number** type.  If we wanted
to throw an error when an invalid type is provided, we can use a nested function
declared within the class body.

```js
class Point {

    @x;
    @y;

    constructor(x = 0, y = 0) {
        @x = _number(x);
        @y = _number(y);
    }

    get x() { return @x }
    set x(value) { @x = _number(value) }

    get y() { return @y }
    set y(value) { @y = _number(value) }

    toString() { return `Point<${ this.@x },${ this.@y }>` }

    function _number(n) {
        // Throw if `n` is not a number or is NaN
        if (+n !== n)
            throw new TypeError("Not a number");

        return n;
    }

}
```

Because private fields are lexically scoped, declarations nested within the class body
can access private state.  (This example uses the proposed
[function bind operator](https://github.com/zenparsing/es-function-bind).)

```js
class Container {

    @count = 0;

    // Other fields...

    clear() {
        if (this::_isEmpty())
            return;

        // Empty the container
    }

    // Other methods...

    function _isEmpty() {
        return @count === 0;
    }
}
```

As shown in the previous example, private fields may have an initializer.  Private field
initializers are evaluated when the constructor's **this** value is initialized.

For more complete examples, see:

- [A port of V8's promise implementation](examples/promise-after.js)
- [A text decoding helper for Node](examples/text-decoder.js)

### Syntax ###

    AtName ::
        @ IdentifierName

    PrivateDeclaration[Yield] :
        AtName Initializer[?Yield](opt) ;

    ClassElement[Yield] :
        PrivateDeclaration[?Yield]
        Declaration[?Yield]
        VariableStatement[?Yield]
        MethodDefinition[?Yield]
        static MethodDefinition[?Yield]
        ;

    MemberExpression[Yield] :
        ...
        MemberExpression[?Yield] . AtName

    CallExpression[Yield] :
        ...
        CallExpression[?Yield] . AtName

    PrimaryExpression[Yield] :
        ...
        AtName


### High-Level Semantics ###

#### Private Declarations ####

- A _PrivateDeclaration_ creates a new **PrivateMap** object bound to the lexical environment
  of the containing _ClassBody_.
- A **PrivateMap** is a specification type with the following methods:
  - has(obj)
  - get(obj)
  - set(obj, value)
- The semantics of each **PrivateMap** method is identical to the corresponding method of
  the built-in **WeakMap** type.

#### Initialization Model ####

- Each class constructor that contains private fields has an internal slot named
  [[PrivateFields]] whose value is a non-empty List of **PrivateFieldRecord** objects
  identifying those private fields.
- A **PrivateFieldRecord** object has the following internal slots:
  - [[Map]]: A **PrivateMap** object.
  - [[Initializer]]: The root node of the parse tree of the private field's initializer
    expression.
- Immediately before initializing the **this** value associated with a Function
  Environment Record to a value _V_, if the environment's [[FunctionObject]] has a
  [[PrivateFields]] list, then for each private field in the list:
  - If [[Initializer]] is empty, then let _initialValue_ be **undefined**.
  - Else let _initialValue_ be the result of evaluating [[Initializer]].
  - Perform [[Map]].set(_V_, _initialValue_).

#### Private References ####

- When an at-name is used as a primary expression such as `@field`, it is equivalent to the
  member expression `this.@field`.
- At-name member expressions return a private reference, whose property name component is a **PrivateMap**
  object.
- When GetValue is called on a private reference _V_:
    - Let _privateMap_ be GetReferencedName(_V_)
    - If _privateMap_.has(_baseValue_) is **false** then throw a **TypeError** exception.
    - Otherwise, return _privateMap_.get(_baseValue_)
    - NOTE: The prototype chain is not traversed
- When SetValue is called on a private reference _V_ with value _W_:
    - Let _privateMap_ be GetReferencedName(_V_)
    - If _privateMap_.has(_baseValue_) is **false** then throw a **TypeError** exception.
    - Otherwise, return _privateMap_.set(_baseValue_, _W_)
    - NOTE: The prototype chain is not traversed

