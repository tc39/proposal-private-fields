## ECMAScript Private Fields ##

TODO: Introduction

### Examples ###

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
