---
title: Mim.ts
nav_order: 3
parent: Modules
---

## Mim overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Classes](#classes)
  - [Mim (class)](#mim-class)
    - [evaluate (property)](#evaluate-property)
    - [source$ (property)](#source-property)
    - [eq (property)](#eq-property)
    - [getValue (property)](#getvalue-property)
    - [setValue (property)](#setvalue-property)
    - [unsubscribe (property)](#unsubscribe-property)
- [utils](#utils)
  - [TypeOf (type alias)](#typeof-type-alias)
  - [protect](#protect)

---

# Classes

## Mim (class)

**Signature**

```ts
export declare class Mim<T> {
  constructor(evaluate: (prev: Option<T>) => T, source$: Observable<T>, eq: Eq<T>)
}
```

Added in v1.0.0

### evaluate (property)

**Signature**

```ts
readonly evaluate: (prev: Option<T>) => T
```

Added in v3.0.0

### source$ (property)

**Signature**

```ts
readonly source$: any
```

Added in v3.0.0

### eq (property)

**Signature**

```ts
readonly eq: Eq<T>
```

Added in v1.0.0

### getValue (property)

**Signature**

```ts
readonly getValue: () => T
```

Added in v1.0.0

### setValue (property)

**Signature**

```ts
readonly setValue: (next: T) => void
```

Added in v1.0.0

### unsubscribe (property)

**Signature**

```ts
readonly unsubscribe: () => void
```

Added in v1.0.0

# utils

## TypeOf (type alias)

**Signature**

```ts
export type TypeOf<T> = T extends Atom<infer U1>
  ? U1
  : T extends ReadonlyAtom<infer U2>
  ? U2
  : T extends Mim<infer U3>
  ? U3
  : never
```

Added in v3.0.0

## protect

**Signature**

```ts
export declare const protect: <T extends Atom<unknown> | ReadonlyAtom<unknown>>(a: T) => T & Mim<TypeOf<T>>
```

Added in v3.0.0
