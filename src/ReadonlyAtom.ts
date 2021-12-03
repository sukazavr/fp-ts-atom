import { Applicative1 } from 'fp-ts/Applicative'
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
import { EMPTY, map as rxMap, Observable } from 'rxjs'
import { Mim } from './Mim'

/**
 * @since 1.0.0
 * @category Model
 */
export interface ReadonlyAtom<T> extends Observable<T> {
  eq: Eq<T>
  get: () => T
}

export class ReadonlyAtomImpl<T> extends Mim<T> implements ReadonlyAtom<T> {
  public get = this.getValue
}

// -------------------------------------------------------------------------------------
// refinements
// -------------------------------------------------------------------------------------

/**
 * @since 1.0.0
 * @category Refinements
 */
export const isReadonlyAtom = <T>(fa: unknown): fa is ReadonlyAtomImpl<T> =>
  fa instanceof ReadonlyAtomImpl

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
) => ReadonlyAtom<T> = (evaluate, source, eq = eqStrict) =>
  new ReadonlyAtomImpl(evaluate, source, eq)

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
    new ReadonlyAtomImpl(() => f(fa.get()), pipe(fa, rxMap(f)), eq)

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

// -------------------------------------------------------------------------------------
// compositions
// -------------------------------------------------------------------------------------

/**
 * Compose an `ReadonlyAtom` with a `Lens`.
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
 * Return an `ReadonlyAtom` from an `ReadonlyAtom` and prop.
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
 * Return an `ReadonlyAtomOption` from an `ReadonlyAtom` focused on a key of a
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
 * Return an `ReadonlyAtomOption` from an `ReadonlyAtom` focused on an index of
 * a `ReadonlyArray`. If you set `None` it won't change the `ReadonlyArray`. If
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
 * Return an `ReadonlyAtom` from an `ReadonlyAtomOption` replacing `None` with
 * the given value.
 *
 * @since 1.0.0
 */
export const withDefault: <A>(
  d: Lazy<A>,
  eq?: Eq<A>
) => (sa: ReadonlyAtom<O.Option<A>>) => ReadonlyAtom<A> = (d, eq = eqStrict) =>
  _map(eq)(O.getOrElse(d))

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

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
  map: (fa, f) => pipe(fa, _mapStrict(f)),
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
