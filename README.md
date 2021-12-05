# fp-ts-atom

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
- [Example](#example)
- [API Reference](#api-reference)
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

## Example

```ts
import * as a from 'fp-ts-atom/Atom'

const state$ = a.of(0);
state$.get(); // 0
state$.set(3);
state$.get(); // 3
```

## API Reference

- [Atom](https://sukazavr.github.io/fp-ts-atom/modules/Atom.ts.html)
- [ReadonlyAtom](https://sukazavr.github.io/fp-ts-atom/modules/ReadonlyAtom.ts.html)

## Install

Uses `fp-ts`, `rxjs` and `monocle-ts` as a peer dependency.

```bash
yarn add fp-ts rxjs monocle-ts fp-ts-atom
```

or

```bash
npm install fp-ts rxjs monocle-ts fp-ts-atom
```
