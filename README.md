# <a href="https://github.com/sukazavr/fp-ts-atom"><img src="https://raw.githubusercontent.com/sukazavr/fp-ts-atom/master/assets/logos/fp-ts-atom.svg" alt="fp-ts-atom" height="32px"></a>

![Test](https://github.com/sukazavr/fp-ts-atom/actions/workflows/build.yml/badge.svg)
![npm version](https://badge.fury.io/js/fp-ts-atom.svg)
![npm downloads](https://img.shields.io/npm/dm/fp-ts-atom.svg)

---

State management solution combining `fp-ts`, `RxJS` and `monocle-ts`

`fp-ts-atom` aims to befriend `RxJS` and `monocle-ts` and provide a convenient way to manage state in a reactive way.

**Inspired by** [@grammarly/focal](https://www.npmjs.com/package/@grammarly/focal)

---

<!-- AUTO-GENERATED-CONTENT:START (TOC) -->
- [Features](#features)
- [Atom](#atom)
- [ReadonlyAtom](#readonlyatom)
- [Install](#install)
<!-- AUTO-GENERATED-CONTENT:END -->

---

## Features
- ♨️ Any `Atom` is a _hot_ `Observable`
- 😪 Lazy initial value evaluation
- 🏃 Deferred source subscription
- 🔎 Compatible with `Lens` from `monocle-ts`
- 🌍 Natively extends `fp-ts` ecosystem
- 🦺 Type-safe operations
- 🧪 Covered by tests

## Atom

General usage of the `Atom` is to store an application state. `Atom` has a `get` and `set` methods that allow to read and write the state. Apart from that, `Atom` is a hot `Observable` which means that you can listen to changes of the state.

`Atom` has `fp-ts` instances: `Pointed`, `FromIO`.

```ts
import { of } from 'fp-ts-atom/Atom';
const state$ = of(0);
state$.get(); // 0
state$.set(3);
state$.get(); // 3
state$.subscribe(console.log); // "3" in console
state$.set(2); // "2" in console
```

[Atom API Reference](https://sukazavr.github.io/fp-ts-atom/modules/Atom.ts.html)

## ReadonlyAtom

`ReadonlyAtom` is useful when you want to protect the state from direct changes. You can derive `ReadonlyAtom` from `Atom` using `toReadonlyAtom` method from `Atom` module or any other method from `ReadonlyAtom` module.

`ReadonlyAtom` has `fp-ts` instances: `Pointed`, `FromIO`, `Functor`, `Apply`, `Applicative`.

```ts
import { of } from 'fp-ts-atom/Atom';
import { map } from 'fp-ts-atom/ReadonlyAtom';
const state$ = of({ a: 0 });
const number$ = pipe(state$, map(s => s.a));
number$.get(); // 0
state$.set({ a: 3 });
number$.get(); // 3
number$.subscribe(console.log); // "3" in console
state$.set({ a: 2 }); // "2" in console
```

[ReadonlyAtom API Reference](https://sukazavr.github.io/fp-ts-atom/modules/ReadonlyAtom.ts.html)

## Install

Uses `fp-ts`, `rxjs` and `monocle-ts` as a peer dependency.

```bash
yarn add fp-ts rxjs monocle-ts fp-ts-atom
```

or

```bash
npm install fp-ts rxjs monocle-ts fp-ts-atom
```
