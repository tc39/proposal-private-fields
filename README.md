## ECMAScript Private Fields ##

TODO: Introduction

### Examples ###

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

TODO: Links more complete examples

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
