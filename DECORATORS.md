The purpose of this document is to outline a possible path for further evolution of the private state proposal. The idea is to make sure that this proposal is consistent with the described evolution path, but to keep these additional features for follow-on proposals.

## Strawman interaction between private fields and decorators

You may want to have decorators over private fields, just like decorators on
ordinary property declarations. The syntax could look like this:

```js
class Foo {
  @decorator
  #bar = baz;
}
```

Extrapolating from [the current decorator proposal](https://github.com/tc39/proposal-decorators/), the function `decorator` would be passed one descriptor and output an array of descriptors of entries in the class.

The question for private state is, what do those descriptors look like for syntactic private field declarations? And, symmetrically, how can can other decorators create new private fields as part of their expansion?

### `PrivateStateField`

The proposal here is to make a new class, `PrivateStateField`, which reifies a private state field across various instances. In the concept, `PrivateStateField` is identical to [`WeakMap`](https://tc39.github.io/ecma262/#sec-weakmap-objects), differing critically in garbage collection:

Semantically, the instances of objects in which `PrivateStateField` has been added as a member "have a reference to" the `PrivateStateField` object. That is, unlike with `WeakMaps`, if nobody explicitly references the `PrivateStateField`, but the `PrivateStateField` has an entry where an object is a key, and that object is still alive, then the value corresponding to the object key is still alive. Or, stated in the terms of the spec mechanics, `PrivateStateField` has a \[\[PrivateID]], and adding an object to a `PrivateStateField` adds an entry in that objects \[\[PrivateFields]] record mapping the \[\[PrivateID]] to the provided value.

`PrivateStateField.prototype` has three methods: `add(object, value)` (which throws if the field exists), `set(object, value)` (which throws if the field does not exist), and `get(object)` (which throws if the field does not exist). These correspond to the operations in private state of adding a field, getting a field and setting a field. The constructor returns a new PrivateStateField, taking a single optional argument, like `Symbol`, which is just used for printing purposes.

### Decorator reification of private state

With first-class `PrivateStateField`, decorators on private state can be represented analogously to decorators on public property declarations. The above code sample may result in a descriptor such as the following being passed to the `decorator` function:

```js
{
  type: 'privateField',
  name: '#bar',
  key: new PrivateStateField('#bar');
  initializer: () => baz,
}
```

Decorators may accept these as arguments, or generate them as entries in the array returned from the decorator to add to the class.

### Polyfill and implementation notes

Including `PrivateStateField` as a built-in in the standard library actually doesn't add any expressive power at all. It can already be implemented with the proposal out for review using the super return trick.

```js
class SuperClass {
  constructor(receiver) { return receiver; }
}

export class PrivateStateField {
  // klasses have been appointed to lead OO design in the transition team
  #klass = class extends SuperClass {
    #member;
    static get(receiver) {
      return receiver.#member;
    }
    static set(receiver, value) {
      return receiver.#member = value;
    }
  };
  get(receiver) {
    #klass.get(receiver);
  }
  set(receiver, object) {
    #klass.set(receiver, object);
  }
  add(reciever, object) {
    new #klass(receiver);
    this.set(receiver, object);
  }
}
```

Some JavaScript implementations already have features which are analogous to `PrivateStateField`. V8 has "private symbols" which are not passed to Proxies, don't go up prototype chains in their lookup, and which can be defined on any object (including a Proxy). For V8, PrivateStateField can be easily implemented by simply giving it a private field which is a private symbol, where the `get`, `set` and `add` methods simply perform property access with this private symbol.

## 'Protected'-style state through decorators on private state

One major feature request for the private state proposal is to ensure that there is a path to protected state or friends. Protected state is requested because there are times in evolving a program when some state may be better off having its access discouraged, but still available to some users, such as subclasses, or privileged classes within the same framework.

### Sidebar: protected state does not add any strong properties to JavaScript

If you have a class with protected state, it is possible to read protected state out of instances without being a subclass. Let's say that protected members can be defined as `protected #foo;`, and the scope of `#foo` is both the class where it's defined as well as all subclasses. A 'hostile' subclass can provide a getter which can read that out of instances of the superclass.

```js
class Superclass {
  protected #foo;
  constructor(foo) { #foo = foo; }
}
let x = new Superclass(1);

class EvilSubclass extends Superclass {
  static getFoo(receiver) { return receiver.#foo; }
}
console.log(EvilSubclass.getFoo(x));
```

So, since protected state doesn't actually enforce privacy, the main thing we are getting out of protected state is that *access is obscured*--you have to go through some steps (e.g., being in a subclass, or building that workaround) to get at the data.

### Putting state in an obscured location via decorators

There are lots of ways that an 'escape hatch' for private state could be exposed via decorators. Below is one possible code sample:

```js
class Example {
  @hidden
  #foo;
  constructor(foo) { #foo = foo; }
}
let x = new Example(1);
console.log(Example.getHiddenFoo(x)); // => 1
```

This could be implemented by the following decorator:

```js
function hidden(descriptor) {
  let getterDescriptor = {
    type: 'method',
    isStatic: true,
    key: 'getHidden' + descriptor.name[1].toUpperCase() + descriptor.name.slice(2),
    value(receiver) {
      return descritor.key.get(receiver);
    }
  };
  return [descriptor, getterDescriptor];
}
```

### TypeScript-style escape hatch--just use square brackets

In TypeScript, if something is marked `private`, you can get around that by using indexing with square brackets, rather than `.`. We could expose something similar using decorators. Example code:

```js
class Example {
  @indexable
  #foo;
  constructor(foo) { #foo = foo; }
}
class Subclass extends Example {
  printFoo() { console.log(this['#foo']); }
  setFoo(value) { this['#foo'] = value; }
}
let x = new Subclass(1);
x.printFoo();  // => 1
x.setFoo(2);
x.printFoo();  // => 2
```

The indexing is available to subclasses and outside of the class. Here's an implementation:

```js
function indexable(descriptor) {
  let getterSetterDescriptor = {
    type: 'accessor',
    key: descriptor.name,
    get(receiver) {
      return descritor.key.get(receiver);
    },
    set(receiver, value) {
      return descritor.key.set(receiver, value);
    }
  };
  return [descriptor, getterSetterDescriptor];
}
```
