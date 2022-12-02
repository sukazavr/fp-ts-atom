/** @since 1.0.0 */
import { Applicative1 } from 'fp-ts/Applicative'
import { Endomorphism } from 'fp-ts/Endomorphism'
import { Eq, eqStrict } from 'fp-ts/Eq'
import { FromIO1 } from 'fp-ts/FromIO'
import { identity, Lazy, pipe } from 'fp-ts/function'
import * as AR from 'fp-ts/lib/ReadonlyArray'
import * as RR from 'fp-ts/lib/ReadonlyRecord'
import * as O from 'fp-ts/Option'
import { Pointed1 } from 'fp-ts/Pointed'
import { ReadonlyRecord } from 'fp-ts/ReadonlyRecord'
import { Lens, lens as ctorLens } from 'monocle-ts/Lens'
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
  evaluate: (prev: O.Option<T>) => T,
  source: Observable<T>,
  eq?: Eq<T>
) => Atom<T> = (evaluate, source, eq = eqStrict) => {
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
  make(O.getOrElse(ma), EMPTY)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const of: Applicative1<URI>['of'] = (a) =>
  make(
    O.getOrElse(() => a),
    EMPTY
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
    ctorLens(
      (s) => s[prop],
      (ap) => (s) => Object.assign({}, s, { [prop]: ap })
    ),
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
) => (sa: Atom<ReadonlyRecord<string, A>>) => Atom<O.Option<A>> = (
  k,
  eq = eqStrict
) =>
  lens(
    ctorLens(
      RR.lookup(k),
      O.fold(
        () => identity,
        (a) => RR.upsertAt(k, a)
      )
    ),
    O.getEq(eq)
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
) => (sa: Atom<ReadonlyArray<A>>) => Atom<O.Option<A>> = (i, eq = eqStrict) =>
  lens(
    ctorLens(
      AR.lookup(i),
      O.fold(
        () => identity,
        (a) => (s) =>
          pipe(
            AR.lookup(i, s),
            O.fold(
              () => s,
              () => AR.unsafeUpdateAt(i, a, s)
            )
          )
      )
    ),
    O.getEq(eq)
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
) => (sa: Atom<O.Option<A>>) => Atom<A> = (d, eq = eqStrict) =>
  lens(
    ctorLens(O.getOrElse(d), (a) => () => O.some(a)),
    eq
  )

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
