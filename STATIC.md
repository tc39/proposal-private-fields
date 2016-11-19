The purpose of this document is to outline a possible path for further evolution of the private state proposal. The idea
is to make sure that this proposal is consistent with the described evolution path, but to keep these additional features
for follow-on proposals.

## Static private field outline

It should be possible to add private static fields, as well as methods, per
[this explainer](https://github.com/tc39/proposal-private-fields/blob/master/METHODS.md). The syntax could look like this:

```js
class MyClass {
  static #foo = 1;
  static #bar() { ... }
};
```

Static private methods and fields would be visible only within the body of the class. They have one value, only for the class
they are defined in, not for subclasses as well. The semantics could be defined two ways:
- These are just lexically scoped variables which have special syntax to make them scoped to the class
- The class actually gets these as private fields and methods, with those same semantics as for instance private fields

I don't think there are observable differences to these semantics.
