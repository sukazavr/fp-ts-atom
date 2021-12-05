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
    - [\_subscribe (method)](#_subscribe-method)
    - [eq (property)](#eq-property)
    - [getValue (property)](#getvalue-property)
    - [setValue (property)](#setvalue-property)
    - [unsubscribe (property)](#unsubscribe-property)

---

# Classes

## Mim (class)

**Signature**

```ts
export declare class Mim<T> {
  constructor(evaluate: (prev: Option<T>) => T, source: Observable<T>, eq: Eq<T>)
}
```

Added in v1.0.0

### \_subscribe (method)

**Signature**

```ts
protected _subscribe(subscriber: Subscriber<T>): Subscription
```

Added in v1.0.0

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
unsubscribe: () => void
```

Added in v1.0.0
