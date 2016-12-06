## ECMAScript Private Fields

### A Brief Introduction

Private field names are represented as an identifier prefixed with the `#` character.  Private field definitions create immutable bindings which are lexically confined to their containing class body and are not reified.  In the following example, `#x` and `#y` identify private fields whose type is guaranteed to be **Number** (but it will throw a TypeError if you pass Symbol as an argument).

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

#### Private Field Identiers

Each field definition effectively creates a unique internal slot identifer. In the specification mechanics, this is based on a Private Field Identifier value, not accessible to user code, which is associated through an internal slot in the object with a value. The system can be thought of as equivalent to WeakMaps, with the only difference being the (implied) garbage collection semantics--the value for the private field is held alive by the object, even if nothing else points to the Private Field Identifier.

#### Constructors and Field Initialization

Each ECMAScript function object has an internal slot named `[[PrivateFieldDefinitions]]` which contains a possibly-empty list of Private Field Identifiers and initializer expressions.  When a class definition is evaluated, the `[[PrivateFieldDefinitions]]` list of the newly created constructor is populated with a Private Field Identifier for each private name definition within the class body.  The constructor adds entries to each object's internal slots, associating the Private Field Identifier to the appropriate value, in this list at the following times:

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

**Q**: Why do we have to use a special character in front of the identifier?

**A**: In short, this seems to be the only way that the system can reliably enforce who has access to the private state in a world with fully dynamic type checking and eval. See [this answer](https://github.com/tc39/proposal-private-fields/issues/14#issuecomment-153050837) for a more detailed explanation of options.

**Q**: Why not use a private version of symbols?

**A**: Private symbols were found to not interact well with membranes used to support certain security paradigms. See [this comment](https://github.com/zenparsing/es-abstract-refs/issues/11#issuecomment-65723350) for details.

**Q**: Why aren't private methods in this proposal?

**A**: This proposal attempts to be minimal, but compatible with a follow-on private methods proposal. See [METHODS.md](https://github.com/tc39/proposal-private-fields/blob/master/METHODS.md) for details.

**Q**: How does private state interact with decorators?

**A**: Private field declarations should be analogous to class property declarations in how they work with decorators. See [DECORATORS.md](https://github.com/tc39/proposal-private-fields/blob/master/DECORATORS.md) for a strawman.

**Q**: Should classes be able to have private fields?

**A**: Also a good possible follow-on proposal;, see [STATIC.md](https://github.com/tc39/proposal-private-fields/blob/master/STATIC.md) for details.

**Q**: Can we use `@` rather than `#` for the sigil, like Ruby?

**A**: TC39 considered this question in the September 2016 TC39 meeting and decided to stick with `@` being proposed for decorators for now. One factor in the decision was the ecosystem of users in transpilation who are using `@` for decorators already.

**Q**: Can we reconsider, in the syntax, the decision to do...

**A**: Yes, it's not too late. Two active discussions on syntax are [whether the declaration should have the word `private` in it](https://github.com/tc39/proposal-private-fields/issues/53) and [what the token should be for initializing a field](https://github.com/tc39/proposal-class-public-fields/issues/33). However, there are other decisions, such as the need for a sigil, and the inability to use `@` for the sigil, that are set for particular strong reasons described above.

**Q**: I have another question about the design of the proposal.

**A**: Check [here](https://github.com/tc39/proposal-private-fields/blob/master/FAQ.md).
