---
title: utils.ts
nav_order: 5
parent: Modules
---

## utils overview

Added in v3.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [ctorMemoizeOnce](#ctormemoizeonce)
  - [eqAny](#eqany)

---

# utils

## ctorMemoizeOnce

It memorizes only one value (input/output) at a time. Be aware of where/when
you call the constructor of the `memoize` function, it determines the closure
between memory state and `memoize` function

**Signature**

```ts
export declare const ctorMemoizeOnce: () => <A>(eqInput: Eq<A>) => <B>(f: (inputN: A) => B) => (inputN: A) => B
```

Added in v3.0.0

## eqAny

**Signature**

```ts
export declare const eqAny: Eq<any>
```

Added in v3.0.0
