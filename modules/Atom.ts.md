---
title: Atom.ts
nav_order: 1
parent: Modules
---

## Atom overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

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
- [Converters](#converters)
  - [toReadonlyAtom](#toreadonlyatom)
- [Instances](#instances)
  - [FromIO](#fromio)
  - [Pointed](#pointed)
  - [URI](#uri)
  - [URI (type alias)](#uri-type-alias)
- [Model](#model)
  - [Atom (interface)](#atom-interface)
- [Refinements](#refinements)
  - [isAtom](#isatom)
- [Utils](#utils)
  - [distinct](#distinct)
  - [modify](#modify)
  - [modifyV](#modifyv)
  - [withDefault](#withdefault)

---

# Compositions

## index

Return an `AtomOption` from an `Atom` focused on an index of a
`ReadonlyArray`. If you set `None` it won't change the `ReadonlyArray`. If
the index is out of bound, it won't change the `ReadonlyArray` no matter what
you pass as `Option`.

**Signature**

```ts
export declare const index: <A>(index: number, eq?: Eq<A> | undefined) => (sa: Atom<readonly A[]>) => Atom<Option<A>>
```

Added in v1.0.0

## key

Return an `AtomOption` from an `Atom` focused on a key of a `ReadonlyRecord`.
If you set `None` it won't change the `ReadonlyRecord`.

**Signature**

```ts
export declare const key: <A>(
  key: string,
  eq?: Eq<A> | undefined
) => (sa: Atom<Readonly<Record<string, A>>>) => Atom<Option<A>>
```

Added in v1.0.0

## lens

Compose an `Atom` with a `Lens`.

**Signature**

```ts
export declare const lens: <A, B>(ab: Lens<A, B>, eq?: Eq<B> | undefined) => (a: Atom<A>) => Atom<B>
```

Added in v1.0.0

## prop

Return an `Atom` from an `Atom` and prop.

**Signature**

```ts
export declare const prop: <A, P extends keyof A>(prop: P, eq?: Eq<A[P]> | undefined) => (sa: Atom<A>) => Atom<A[P]>
```

Added in v1.0.0

# Constructors

## fromIO

**Signature**

```ts
export declare const fromIO: NaturalTransformation11<'IO', 'Atom'>
```

Added in v1.0.0

## getOf

**Signature**

```ts
export declare const getOf: <A>(eq: Eq<A>) => (a: A) => Atom<A>
```

Added in v3.0.0

## make

**Signature**

```ts
export declare const make: <T>(evaluate: (prev: Option<T>) => T, source: any, eq: Eq<T>) => Atom<T>
```

Added in v1.0.0

## of

**Signature**

```ts
export declare const of: <A>(a: A) => Atom<A>
```

Added in v1.0.0

# Converters

## toReadonlyAtom

Convert an `Atom` to `ReadonlyAtom`.

**Signature**

```ts
export declare const toReadonlyAtom: <T>(a: Atom<T>) => ReadonlyAtom<T>
```

Added in v1.0.0

# Instances

## FromIO

**Signature**

```ts
export declare const FromIO: FromIO1<'Atom'>
```

Added in v1.0.0

## Pointed

**Signature**

```ts
export declare const Pointed: Pointed1<'Atom'>
```

Added in v1.0.0

## URI

**Signature**

```ts
export declare const URI: 'Atom'
```

Added in v1.0.0

## URI (type alias)

**Signature**

```ts
export type URI = typeof URI
```

Added in v1.0.0

# Model

## Atom (interface)

**Signature**

```ts
export interface Atom<T> extends Observable<T> {
  eq: Eq<T>
  get: () => T
  set: (next: T) => void
}
```

Added in v1.0.0

# Refinements

## isAtom

**Signature**

```ts
export declare const isAtom: <T>(fa: unknown) => fa is Atom<T>
```

Added in v1.0.0

# Utils

## distinct

Return an `Atom` from an `Atom` with new Eq instance.

**Signature**

```ts
export declare const distinct: <A>(eq: Eq<A>) => Endomorphism<Atom<A>>
```

Added in v1.1.0

## modify

Sequence of `Atom.get` and `Atom.set` using `Endomorphism` to modify the value.

**Signature**

```ts
export declare const modify: <A>(e: Endomorphism<A>) => (a: Atom<A>) => void
```

Added in v1.1.0

## modifyV

Like `modify` but flipped, which the “V” suffix denotes.

**Signature**

```ts
export declare const modifyV: <A>(a: Atom<A>) => (e: Endomorphism<A>) => void
```

Added in v1.1.0

## withDefault

Return an `Atom` from an `AtomOption` replacing `None` with the given value.

**Signature**

```ts
export declare const withDefault: <A>(d: Lazy<A>, eq?: Eq<A> | undefined) => (sa: Atom<Option<A>>) => Atom<A>
```

Added in v1.0.0
