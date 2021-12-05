# fp-ts-atom

[![Test](http:&#x2F;&#x2F;&#x2F;actions&#x2F;workflows&#x2F;build.yml&#x2F;badge.svg)](http:&#x2F;&#x2F;&#x2F;actions&#x2F;workflows&#x2F;build.yml)

[API Docs](http://)

---

<!-- AUTO-GENERATED-CONTENT:START (TOC) -->
- [Install](#install)
- [Example](#example)
<!-- AUTO-GENERATED-CONTENT:END -->

## Install

Uses `fp-ts` as a peer dependency.

```bash
yarn add fp-ts fp-ts-atom
```

or

```bash
npm install fp-ts fp-ts-atom
```

## Example

```ts
import * as a from 'fp-ts-atom/Atom'

const state$ = a.atom(0);
state$.get(); // 0
state$.set(3);
state$.get(); // 3
```
