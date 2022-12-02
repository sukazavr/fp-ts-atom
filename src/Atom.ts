/** @since 1.0.0 */
import type { Applicative1 } from 'fp-ts/Applicative'
import type { Endomorphism } from 'fp-ts/Endomorphism'
import { Eq, eqStrict } from 'fp-ts/Eq'
import type { FromIO1 } from 'fp-ts/FromIO'
import { identity, Lazy, pipe } from 'fp-ts/function'
import {
  lookup as raLookup,
  unsafeUpdateAt as raUnsafeUpdateAt,
} from 'fp-ts/lib/ReadonlyArray'
import {
  lookup as rrLookup,
  upsertAt as rrUpsertAt,
} from 'fp-ts/lib/ReadonlyRecord'
import {
  fold as oFold,
  getEq as oGetEq,
  getOrElse as oGetOrElse,
  Option,
  some,
} from 'fp-ts/Option'
import type { Pointed1 } from 'fp-ts/Pointed'
import type { ReadonlyRecord } from 'fp-ts/ReadonlyRecord'
import type { Lens } from 'monocle-ts/Lens'
import { EMPTY, map, Observable } from 'rxjs'
import { Mim, protect } from './Mim'
import { make as arMake, ReadonlyAtom } from './ReadonlyAtom'

/**
 * @since 1.0.0
 * @category Model
 */
export interface Atom<T> extends Observable<T> {
  eq: Eq<T>
  get: () => T
  set: (next: T) => void
}

// -------------------------------------------------------------------------------------
// refinements
// -------------------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category Refinements
 */
export const isAtom = <T>(fa: unknown): fa is Atom<T> =>
  fa instanceof Mim && 'get' in fa && 'set' in fa

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: <T>(
  evaluate: (prev: Option<T>) => T,
  source: Observable<T>,
  eq: Eq<T>
) => Atom<T> = (evaluate, source, eq) => {
  const instance = new Mim(evaluate, source, eq)
  return Object.assign(instance, {
    set: instance.setValue,
    get: instance.getValue,
  })
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const fromIO: FromIO1<URI>['fromIO'] = (ma) =>
  make(oGetOrElse(ma), EMPTY, eqStrict)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const of: Applicative1<URI>['of'] = (a) =>
  make(
    oGetOrElse(() => a),
    EMPTY,
    eqStrict
  )

// -------------------------------------------------------------------------------------
// converters
// -------------------------------------------------------------------------------------

/**
 * Convert an `Atom` to `ReadonlyAtom`.
 *
 * @since 1.0.0
 * @category Converters
 */
export const toReadonlyAtom: <T>(a: Atom<T>) => ReadonlyAtom<T> = (a) =>
  arMake(a.get, a, a.eq)

// -------------------------------------------------------------------------------------
// compositions
// -------------------------------------------------------------------------------------

/**
 * Compose an `Atom` with a `Lens`.
 *
 * @since 1.0.0
 * @category Compositions
 */
export const lens: <A, B>(
  ab: Lens<A, B>,
  eq?: Eq<B>
) => (a: Atom<A>) => Atom<B> =
  (ab, eq = eqStrict) =>
  (a) => {
    const b = make(() => ab.get(a.get()), map(ab.get)(a), eq)
    b.set = (nextB) => {
      const prevA = a.get()
      const prevB = ab.get(prevA)
      if (!eq.equals(prevB, nextB)) {
        a.set(ab.set(nextB)(prevA))
      }
    }
    return b
  }

/**
 * Return an `Atom` from an `Atom` and prop.
 *
 * @since 1.0.0
 * @category Compositions
 */
export const prop: <A, P extends keyof A>(
  prop: P,
  eq?: Eq<A[P]>
) => (sa: Atom<A>) => Atom<A[P]> = (prop, eq = eqStrict) =>
  lens(
    {
      get: (s) => s[prop],
      set: (ap) => (s) => Object.assign({}, s, { [prop]: ap }),
    },
    eq
  )

/**
 * Return an `AtomOption` from an `Atom` focused on a key of a `ReadonlyRecord`.
 * If you set `None` it won't change the `ReadonlyRecord`.
 *
 * @since 1.0.0
 * @category Compositions
 */
export const key: <A>(
  key: string,
  eq?: Eq<A>
) => (sa: Atom<ReadonlyRecord<string, A>>) => Atom<Option<A>> = (
  k,
  eq = eqStrict
) =>
  lens(
    {
      get: rrLookup(k),
      set: oFold(
        () => identity,
        (a) => rrUpsertAt(k, a)
      ),
    },
    oGetEq(eq)
  )

/**
 * Return an `AtomOption` from an `Atom` focused on an index of a
 * `ReadonlyArray`. If you set `None` it won't change the `ReadonlyArray`. If
 * the index is out of bound, it won't change the `ReadonlyArray` no matter what
 * you pass as `Option`.
 *
 * @since 1.0.0
 * @category Compositions
 */
export const index: <A>(
  index: number,
  eq?: Eq<A>
) => (sa: Atom<ReadonlyArray<A>>) => Atom<Option<A>> = (i, eq = eqStrict) =>
  lens(
    {
      get: raLookup(i),
      set: oFold(
        () => identity,
        (a) => (s) =>
          pipe(
            raLookup(i, s),
            oFold(
              () => s,
              () => raUnsafeUpdateAt(i, a, s)
            )
          )
      ),
    },
    oGetEq(eq)
  )

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * Sequence of `Atom.get` and `Atom.set` using `Endomorphism` to modify the value.
 *
 * @since 1.1.0
 * @category Utils
 */
export const modify: <A>(e: Endomorphism<A>) => (a: Atom<A>) => void =
  (e) => (a) =>
    pipe(a.get(), e, a.set)

/**
 * Like `modify` but flipped, which the “V” suffix denotes.
 *
 * @since 1.1.0
 * @category Utils
 */
export const modifyV: <A>(a: Atom<A>) => (e: Endomorphism<A>) => void =
  (a) => (e) =>
    pipe(a.get(), e, a.set)

/**
 * Return an `Atom` from an `Atom` with new Eq instance.
 *
 * @since 1.1.0
 * @category Utils
 */
export const distinct: <A>(eq: Eq<A>) => Endomorphism<Atom<A>> =
  (eq) => (a) => {
    const ma$ = protect(a)
    return make(ma$.evaluate, ma$.source$, eq)
  }

/**
 * Return an `Atom` from an `AtomOption` replacing `None` with the given value.
 *
 * @since 1.0.0
 * @category Utils
 */
export const withDefault: <A>(
  d: Lazy<A>,
  eq?: Eq<A>
) => (sa: Atom<Option<A>>) => Atom<A> = (d, eq = eqStrict) =>
  lens({ get: oGetOrElse(d), set: (a) => () => some(a) }, eq)

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category Instances
 */
export const URI = 'Atom'

/**
 * @since 1.0.0
 * @category Instances
 */
export type URI = typeof URI

declare module 'fp-ts/lib/HKT' {
  interface URItoKind<A> {
    readonly [URI]: Atom<A>
  }
}

/**
 * @since 1.0.0
 * @category Instances
 */
export const Pointed: Pointed1<URI> = {
  URI,
  of,
}

/**
 * @since 1.0.0
 * @category Instances
 */
export const FromIO: FromIO1<URI> = {
  URI,
  fromIO,
}
