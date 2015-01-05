## ECMAScript Private Fields ##

This proposal extends ECMAScript by introducing *private fields* and other features
necessary for supporting *high-integrity classes*.

### A Brief Introduction ###

Private fields are represented as an identifer prefixed with the `@` character.  Private
fields are lexcically confined to their containing class and are not reified.  In the
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

Private fields may have an initializer.  The initializer is evaluated during private
field initialization, which occurs when the constructor is called, and before default
constructor arguments are evaluated.

For more complete examples, see:

- [A port of V8's promise implementation](examples/promise-after.js)
- [A text decoding helper for Node](examples/text-decoder.js)

### Motivation ###

### Design Goals ###

### Features ###

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


### Static Semantics ###

TODO

### Runtime Semantics ###

TODO
