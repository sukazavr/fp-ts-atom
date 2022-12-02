/** @since 1.0.0 */
import type { Applicative1 } from 'fp-ts/Applicative'
import type { Apply1 } from 'fp-ts/Apply'
import type { Chain1 } from 'fp-ts/Chain'
import type { Endomorphism } from 'fp-ts/Endomorphism'
import { Eq, eqStrict } from 'fp-ts/Eq'
import type { FromIO1 } from 'fp-ts/FromIO'
import { flow, identity, Lazy, pipe } from 'fp-ts/function'
import type { Functor1 } from 'fp-ts/Functor'
import { lookup as raLookup } from 'fp-ts/lib/ReadonlyArray'
import { lookup as rrLookup } from 'fp-ts/lib/ReadonlyRecord'
import type { Monad1 } from 'fp-ts/Monad'
import { getEq as oGetEq, getOrElse as oGetOrElse, Option } from 'fp-ts/Option'
import type { Pointed1 } from 'fp-ts/Pointed'
import type { ReadonlyRecord } from 'fp-ts/ReadonlyRecord'
import type { Lens } from 'monocle-ts/Lens'
import { combineLatest, EMPTY, map as rxMap, Observable, switchMap } from 'rxjs'
import { Mim, protect } from './Mim'
import { ctorMemoizeOnce } from './utils'

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
  evaluate: (prev: Option<T>) => T,
  source: Observable<T>,
  eq: Eq<T>
) => ReadonlyAtom<T> = (evaluate, source, eq) => {
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
    ),
    eqStrict
  )

/**
 * Composes computations in sequence, using the return value of one computation
 * to determine the next computation.
 *
 * @since 3.0.0
 * @category Sequencing
 */
export const chain: <A, B>(
  f: (a: A) => ReadonlyAtom<B>
) => (ma: ReadonlyAtom<A>) => ReadonlyAtom<B> = (f) => (ma) => {
  const ma$ = protect(ma)
  const getMb$ = ctorMemoizeOnce()(ma$.eq)(flow(f, protect))
  return make(() => getMb$(ma.get()).get(), switchMap(getMb$)(ma), {
    equals: (prev, next) => getMb$(ma.get()).eq.equals(prev, next),
  })
}

/**
 * @since 3.0.0
 * @category Sequencing
 */
export const flatten: <A>(
  mma: ReadonlyAtom<ReadonlyAtom<A>>
) => ReadonlyAtom<A> = chain(identity)

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
) => (sa: ReadonlyAtom<ReadonlyRecord<string, A>>) => ReadonlyAtom<Option<A>> =
  (k, eq = eqStrict) => _map(oGetEq(eq))(rrLookup(k))

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
) => (sa: ReadonlyAtom<ReadonlyArray<A>>) => ReadonlyAtom<Option<A>> = (
  i,
  eq = eqStrict
) => _map(oGetEq(eq))(raLookup(i))

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
) => (sa: ReadonlyAtom<Option<A>>) => ReadonlyAtom<A> = (d, eq = eqStrict) =>
  _map(eq)(oGetOrElse(d))

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

const map_: Functor1<URI>['map'] = (fa, f) => pipe(fa, map(f))
const ap_: Apply1<URI>['ap'] = (fab, fa) => pipe(fab, ap(fa))
const chain_: Chain1<URI>['chain'] = (ma, f) => pipe(ma, chain(f))

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

/**
 * @since 3.0.0
 * @category Instances
 */
export const Chain: Chain1<URI> = {
  URI,
  map: map_,
  ap: ap_,
  chain: chain_,
}

/**
 * @since 3.0.0
 * @category Instances
 */
export const Monad: Monad1<URI> = {
  URI,
  map: map_,
  ap: ap_,
  chain: chain_,
  of,
}
