---
title: ReadonlyAtom.ts
nav_order: 4
parent: Modules
---

## ReadonlyAtom overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Apply](#apply)
  - [ap](#ap)
- [Compositions](#compositions)
  - [index](#index)
  - [key](#key)
  - [lens](#lens)
  - [prop](#prop)
- [Constructors](#constructors)
  - [fromIO](#fromio)
  - [getOf](#getof)
  - [make](#make)
  - [of](#of)
- [Functor](#functor)
  - [map](#map)
- [Instances](#instances)
  - [Applicative](#applicative)
  - [Apply](#apply-1)
  - [Chain](#chain)
  - [FromIO](#fromio)
  - [Functor](#functor-1)
  - [Monad](#monad)
  - [Pointed](#pointed)
  - [URI](#uri)
  - [URI (type alias)](#uri-type-alias)
- [Model](#model)
  - [ReadonlyAtom (interface)](#readonlyatom-interface)
- [Refinements](#refinements)
  - [isReadonlyAtom](#isreadonlyatom)
- [Sequencing](#sequencing)
  - [chain](#chain)
  - [flatten](#flatten)
- [Utils](#utils)
  - [distinct](#distinct)
  - [withDefault](#withdefault)

---

# Apply

## ap

Apply a function to an argument under a type constructor.

**Signature**

```ts
export declare const ap: <A>(fa: ReadonlyAtom<A>) => <B>(fab: ReadonlyAtom<(a: A) => B>) => ReadonlyAtom<B>
```

Added in v1.1.0

# Compositions

## index

Return a `ReadonlyAtomOption` from a `ReadonlyAtom` focused on an index of a
`ReadonlyArray`. If you set `None` it won't change the `ReadonlyArray`. If
the index is out of bound, it won't change the `ReadonlyArray` no matter what
you pass as `Option`.

**Signature**

```ts
export declare const index: <A>(
  index: number,
  eq?: Eq<A> | undefined
) => (sa: ReadonlyAtom<readonly A[]>) => ReadonlyAtom<Option<A>>
```

Added in v1.0.0

## key

Return a `ReadonlyAtomOption` from a `ReadonlyAtom` focused on a key of a
`ReadonlyRecord`. If you set `None` it won't change the `ReadonlyRecord`.

**Signature**

```ts
export declare const key: <A>(
  key: string,
  eq?: Eq<A> | undefined
) => (sa: ReadonlyAtom<Readonly<Record<string, A>>>) => ReadonlyAtom<Option<A>>
```

Added in v1.0.0

## lens

Compose a `ReadonlyAtom` with a `Lens`.

**Signature**

```ts
export declare const lens: <A, B>(ab: Lens<A, B>, eq?: Eq<B> | undefined) => (a: ReadonlyAtom<A>) => ReadonlyAtom<B>
```

Added in v1.0.0

## prop

Return a `ReadonlyAtom` from a `ReadonlyAtom` and prop.

**Signature**

```ts
export declare const prop: <A, P extends keyof A>(
  prop: P,
  eq?: Eq<A[P]> | undefined
) => (sa: ReadonlyAtom<A>) => ReadonlyAtom<A[P]>
```

Added in v1.0.0

# Constructors

## fromIO

**Signature**

```ts
export declare const fromIO: NaturalTransformation11<'IO', 'ReadonlyAtom'>
```

Added in v1.0.0

## getOf

**Signature**

```ts
export declare const getOf: <A>(eq: Eq<A>) => (a: A) => ReadonlyAtom<A>
```

Added in v3.0.0

## make

**Signature**

```ts
export declare const make: <T>(evaluate: (prev: Option<T>) => T, source: any, eq: Eq<T>) => ReadonlyAtom<T>
```

Added in v1.0.0

## of

**Signature**

```ts
export declare const of: <A>(a: A) => ReadonlyAtom<A>
```

Added in v1.0.0

# Functor

## map

`map` can be used to turn functions `(a: A) => B` into functions `(fa: F<A>) => F<B>` whose argument and return types use the type constructor `F` to
represent some computational context.

**Signature**

```ts
export declare const map: <A, B>(f: (a: A) => B) => (fa: ReadonlyAtom<A>) => ReadonlyAtom<B>
```

Added in v1.0.0

# Instances

## Applicative

**Signature**

```ts
export declare const Applicative: Applicative1<'ReadonlyAtom'>
```

Added in v1.1.0

## Apply

**Signature**

```ts
export declare const Apply: Apply1<'ReadonlyAtom'>
```

Added in v1.1.0

## Chain

**Signature**

```ts
export declare const Chain: Chain1<'ReadonlyAtom'>
```

Added in v3.0.0

## FromIO

**Signature**

```ts
export declare const FromIO: FromIO1<'ReadonlyAtom'>
```

Added in v1.0.0

## Functor

**Signature**

```ts
export declare const Functor: Functor1<'ReadonlyAtom'>
```

Added in v1.0.0

## Monad

**Signature**

```ts
export declare const Monad: Monad1<'ReadonlyAtom'>
```

Added in v3.0.0

## Pointed

**Signature**

```ts
export declare const Pointed: Pointed1<'ReadonlyAtom'>
```

Added in v1.0.0

## URI

**Signature**

```ts
export declare const URI: 'ReadonlyAtom'
```

Added in v1.0.0

## URI (type alias)

**Signature**

```ts
export type URI = typeof URI
```

Added in v1.0.0

# Model

## ReadonlyAtom (interface)

**Signature**

```ts
export interface ReadonlyAtom<T> extends Observable<T> {
  // It hasn't `eq` prop because we want to support narrowing assignments
  get: () => T
}
```

Added in v1.0.0

# Refinements

## isReadonlyAtom

**Signature**

```ts
export declare const isReadonlyAtom: <T>(fa: unknown) => fa is ReadonlyAtom<T>
```

Added in v1.0.0

# Sequencing

## chain

Composes computations in sequence, using the return value of one computation
to determine the next computation.

**Signature**

```ts
export declare const chain: <A, B>(f: (a: A) => ReadonlyAtom<B>) => (ma: ReadonlyAtom<A>) => ReadonlyAtom<B>
```

Added in v3.0.0

## flatten

**Signature**

```ts
export declare const flatten: <A>(mma: ReadonlyAtom<ReadonlyAtom<A>>) => ReadonlyAtom<A>
```

Added in v3.0.0

# Utils

## distinct

Return a `ReadonlyAtom` from a `ReadonlyAtom` with new Eq instance.

**Signature**

```ts
export declare const distinct: <A>(eq: Eq<A>) => Endomorphism<ReadonlyAtom<A>>
```

Added in v1.1.0

## withDefault

Return a `ReadonlyAtom` from a `ReadonlyAtomOption` replacing `None` with the
given value.

**Signature**

```ts
export declare const withDefault: <A>(
  d: Lazy<A>,
  eq?: Eq<A> | undefined
) => (sa: ReadonlyAtom<Option<A>>) => ReadonlyAtom<A>
```

Added in v1.0.0
