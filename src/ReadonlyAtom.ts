/** @since 1.0.0 */
import { Applicative1 } from 'fp-ts/Applicative'
import { Apply1 } from 'fp-ts/Apply'
import { Endomorphism } from 'fp-ts/Endomorphism'
import { Eq, eqStrict } from 'fp-ts/Eq'
import { FromIO1 } from 'fp-ts/FromIO'
import { Lazy, pipe } from 'fp-ts/function'
import { Functor1 } from 'fp-ts/Functor'
import * as O from 'fp-ts/Option'
import { Pointed1 } from 'fp-ts/Pointed'
import * as AR from 'fp-ts/ReadonlyArray'
import * as RR from 'fp-ts/ReadonlyRecord'
import { ReadonlyRecord } from 'fp-ts/ReadonlyRecord'
import { Lens } from 'monocle-ts/Lens'
import { combineLatest, EMPTY, map as rxMap, Observable } from 'rxjs'
import { Mim, protect } from './Mim'

/**
 * @since 1.0.0
 * @category Model
 */
export interface ReadonlyAtom<T> extends Observable<T> {
  // It hasn't `eq` prop because we want to support narrowing assignments
  get: () => T
}

// -------------------------------------------------------------------------------------
// refinements
// -------------------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category Refinements
 */
export const isReadonlyAtom = <T>(fa: unknown): fa is ReadonlyAtom<T> =>
  fa instanceof Mim && 'get' in fa

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
) => ReadonlyAtom<T> = (evaluate, source, eq = eqStrict) => {
  const instance = new Mim(evaluate, source, eq)
  return Object.assign(instance, {
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
// type class members
// -------------------------------------------------------------------------------------

const _map: <B>(
  eq: Eq<B>
) => <A>(f: (a: A) => B) => (fa: ReadonlyAtom<A>) => ReadonlyAtom<B> =
  (eq) => (f) => (fa) =>
    make(() => f(fa.get()), pipe(fa, rxMap(f)), eq)

const _mapStrict: <A, B>(
  f: (a: A) => B
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => (fa: ReadonlyAtom<A>) => ReadonlyAtom<B> = _map(eqStrict as Eq<any>)

/**
 * `map` can be used to turn functions `(a: A) => B` into functions `(fa: F<A>)
 * => F<B>` whose argument and return types use the type constructor `F` to
 * represent some computational context.
 *
 * @since 1.0.0
 * @category Functor
 */
export const map: <A, B>(
  f: (a: A) => B
) => (fa: ReadonlyAtom<A>) => ReadonlyAtom<B> = _mapStrict

/**
 * Apply a function to an argument under a type constructor.
 *
 * @since 1.1.0
 * @category Apply
 */
export const ap: <A>(
  fa: ReadonlyAtom<A>
) => <B>(fab: ReadonlyAtom<(a: A) => B>) => ReadonlyAtom<B> = (fa) => (fab) =>
  make(
    () => fab.get()(fa.get()),
    pipe(
      combineLatest([fab, fa]),
      rxMap(([f, a]) => f(a))
    )
  )

// -------------------------------------------------------------------------------------
// compositions
// -------------------------------------------------------------------------------------

/**
 * Compose a `ReadonlyAtom` with a `Lens`.
 *
 * @since 1.0.0
 * @category Compositions
 */
export const lens: <A, B>(
  ab: Lens<A, B>,
  eq?: Eq<B>
) => (a: ReadonlyAtom<A>) => ReadonlyAtom<B> = (ab, eq = eqStrict) =>
  _map(eq)(ab.get)

/**
 * Return a `ReadonlyAtom` from a `ReadonlyAtom` and prop.
 *
 * @since 1.0.0
 * @category Compositions
 */
export const prop: <A, P extends keyof A>(
  prop: P,
  eq?: Eq<A[P]>
) => (sa: ReadonlyAtom<A>) => ReadonlyAtom<A[P]> = (prop, eq = eqStrict) =>
  _map(eq)((s) => s[prop])

/**
 * Return a `ReadonlyAtomOption` from a `ReadonlyAtom` focused on a key of a
 * `ReadonlyRecord`. If you set `None` it won't change the `ReadonlyRecord`.
 *
 * @since 1.0.0
 * @category Compositions
 */
export const key: <A>(
  key: string,
  eq?: Eq<A>
) => (
  sa: ReadonlyAtom<ReadonlyRecord<string, A>>
) => ReadonlyAtom<O.Option<A>> = (k, eq = eqStrict) =>
  _map(O.getEq(eq))(RR.lookup(k))

/**
 * Return a `ReadonlyAtomOption` from a `ReadonlyAtom` focused on an index of a
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
) => (sa: ReadonlyAtom<ReadonlyArray<A>>) => ReadonlyAtom<O.Option<A>> = (
  i,
  eq = eqStrict
) => _map(O.getEq(eq))(AR.lookup(i))

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * Return a `ReadonlyAtom` from a `ReadonlyAtom` with new Eq instance.
 *
 * @since 1.1.0
 * @category Utils
 */
export const distinct: <A>(eq: Eq<A>) => Endomorphism<ReadonlyAtom<A>> =
  (eq) => (a) => {
    const m = protect(a)
    return make(m.evaluate, m.source$, eq)
  }

/**
 * Return a `ReadonlyAtom` from a `ReadonlyAtomOption` replacing `None` with the
 * given value.
 *
 * @since 1.0.0
 * @category Utils
 */
export const withDefault: <A>(
  d: Lazy<A>,
  eq?: Eq<A>
) => (sa: ReadonlyAtom<O.Option<A>>) => ReadonlyAtom<A> = (d, eq = eqStrict) =>
  _map(eq)(O.getOrElse(d))

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

const map_: Functor1<URI>['map'] = (fa, f) => pipe(fa, map(f))
const ap_: Apply1<URI>['ap'] = (fab, fa) => pipe(fab, ap(fa))

/**
 * @since 1.0.0
 * @category Instances
 */
export const URI = 'ReadonlyAtom'

/**
 * @since 1.0.0
 * @category Instances
 */
export type URI = typeof URI

declare module 'fp-ts/lib/HKT' {
  interface URItoKind<A> {
    readonly [URI]: ReadonlyAtom<A>
  }
}

/**
 * @since 1.0.0
 * @category Instances
 */
export const Functor: Functor1<URI> = {
  URI,
  map: map_,
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

/**
 * @since 1.1.0
 * @category Instances
 */
export const Apply: Apply1<URI> = {
  URI,
  map: map_,
  ap: ap_,
}

/**
 * @since 1.1.0
 * @category Instances
 */
export const Applicative: Applicative1<URI> = {
  URI,
  map: map_,
  ap: ap_,
  of,
}
