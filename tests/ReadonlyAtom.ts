import { contramap, Eq, eqStrict, struct } from 'fp-ts/Eq'
import { pipe } from 'fp-ts/function'
import { getOrElse, none, Some } from 'fp-ts/Option'
import { ReadonlyRecord } from 'fp-ts/ReadonlyRecord'
import * as L from 'monocle-ts/Lens'
import * as r from 'rxjs'
import { noop, timer } from 'rxjs'
import { fakeSchedulers } from 'rxjs-marbles/jest'
import * as ro from 'rxjs/operators'
import * as a from '../src/Atom'
import * as _ from '../src/ReadonlyAtom'

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(noop)
})

type TestStruct = { a: { b: number } }

const eqTestStruct = struct<TestStruct>({
  a: struct({
    b: eqStrict,
  }),
})

const ctorValue = (): TestStruct => ({
  a: { b: Math.round(Math.random() * 100) },
})

const testBasic = (ctorAtom: (v: TestStruct) => _.ReadonlyAtom<TestStruct>) => {
  describe('basic', () => {
    beforeEach(() => jest.useFakeTimers())
    it('w/o subscription', () => {
      const a = ctorValue()
      const atom = ctorAtom(a)
      expect(atom.get()).toBe(a)
    })
    it(
      'with subscription',
      fakeSchedulers((advance) => {
        const a = ctorValue()
        const atom = ctorAtom(a)
        const next = jest.fn()
        atom.subscribe(next)
        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenLastCalledWith(a)
        advance(1000)
        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenLastCalledWith(a)
      })
    )
  })
}

const testEq = (
  ctorAtom: (
    initial: TestStruct,
    source: r.Observable<TestStruct>,
    eq: Eq<TestStruct>
  ) => _.ReadonlyAtom<TestStruct>
) => {
  describe('eq', () => {
    beforeEach(() => jest.useFakeTimers())
    it(
      'should work with strict eq',
      fakeSchedulers((advance) => {
        const a = ctorValue()
        const b = ctorValue()
        const atom = ctorAtom(
          a,
          r.concat(pipe(r.of(a), ro.delay(10)), pipe(r.of(b), ro.delay(10))),
          eqStrict
        )
        const next = jest.fn()
        atom.subscribe(next)
        expect(atom.get()).toBe(a)
        advance(10)
        expect(atom.get()).toBe(a)
        advance(10)
        expect(atom.get()).toBe(b)
        expect(next).toBeCalledTimes(2)
      })
    )
    it(
      'should work with custom eq',
      fakeSchedulers((advance) => {
        const a = ctorValue()
        const b = ctorValue()
        const atom = ctorAtom(
          a,
          r.concat(
            pipe(r.of({ a: { b: a.a.b } }), ro.delay(10)),
            pipe(r.of(b), ro.delay(10))
          ),
          {
            equals: (prev, next) => prev.a.b === next.a.b,
          }
        )
        const next = jest.fn()
        atom.subscribe(next)
        expect(atom.get() === a).toBeTruthy()
        advance(10)
        expect(atom.get() === a).toBeTruthy()
        advance(10)
        expect(atom.get() === b).toBeTruthy()
        expect(next).toBeCalledTimes(2)
      })
    )
  })
}

describe('types', () => {
  it('should support narrowing assignments', () => {
    const fn = jest.fn((value: _.ReadonlyAtom<{ a: { b: number } }>) => value)
    const value = _.of({ a: { b: 1, c: null, d: '3' }, b: 1, c: '3' })
    fn(value)
    expect(fn).toBeCalledWith(value)
  })
})

describe('isReadonlyAtom', () => {
  it('should be true', () => {
    expect(_.isReadonlyAtom(_.of(ctorValue()))).toBeTruthy()
    expect(_.isReadonlyAtom(a.of(ctorValue()))).toBeTruthy()
  })
  it('should be false', () => {
    expect(_.isReadonlyAtom(1)).toBeFalsy()
    expect(_.isReadonlyAtom({})).toBeFalsy()
    expect(_.isReadonlyAtom(r.noop)).toBeFalsy()
    expect(_.isReadonlyAtom(r.NEVER)).toBeFalsy()
    expect(_.isReadonlyAtom(new r.Subject())).toBeFalsy()
  })
})

describe('make', () => {
  testBasic((v) =>
    _.make(
      getOrElse(() => v),
      r.NEVER,
      eqStrict
    )
  )
  testEq((initial, source, eq) =>
    _.make(
      getOrElse(() => initial),
      source,
      eq
    )
  )
})

describe('fromIO', () => {
  testBasic((v) => _.fromIO(() => v))
})

describe('of', () => {
  testBasic((v) => _.of(v))
})

describe('getOf', () => {
  testBasic(_.getOf(eqTestStruct))
})

describe('map', () => {
  testBasic((prop) =>
    pipe(
      _.of({ prop }),
      _.map((v) => v.prop)
    )
  )
  testEq((initial, source, eq) =>
    pipe(
      _.make(
        getOrElse(() => ({ prop: initial })),
        pipe(
          source,
          ro.map((prop) => ({ prop }))
        ),
        pipe(
          eq,
          contramap((a) => a.prop)
        )
      ),
      _.map((v) => v.prop)
    )
  )
  it('should calculate nested value', () => {
    const a = ctorValue()
    const mapped = pipe(
      _.of(a),
      _.map((v) => v.a.b + 1)
    )
    expect(mapped.get() === a.a.b + 1).toBeTruthy()
  })
})

describe('ap', () => {
  testBasic((prop) =>
    pipe(
      _.of((v: { prop: TestStruct }) => v.prop),
      _.ap(_.of({ prop }))
    )
  )
  it('should calculate nested value', () => {
    const a = ctorValue()
    const mapped = pipe(
      _.of((v: TestStruct) => v.a.b + 1),
      _.ap(_.of(a))
    )
    expect(mapped.get() === a.a.b + 1).toBeTruthy()
  })
})

describe('lens', () => {
  testBasic((prop) =>
    pipe(
      _.of({ prop }),
      _.lens(pipe(L.id<{ prop: TestStruct }>(), L.prop('prop')))
    )
  )
  testEq((initial, source, eq) =>
    pipe(
      _.make(
        getOrElse(() => ({ prop: initial })),
        pipe(
          source,
          ro.map((prop) => ({ prop }))
        ),
        pipe(
          eq,
          contramap((a) => a.prop)
        )
      ),
      _.lens(pipe(L.id<{ prop: TestStruct }>(), L.prop('prop')))
    )
  )
  it('should calculate nested value', () => {
    const a = ctorValue()
    const lensed = pipe(
      _.of(a),
      _.lens(
        pipe(
          L.id<TestStruct>(),
          L.prop('a'),
          L.prop('b'),
          L.composeLens(
            L.lens(
              (x) => x + 1,
              (x) => () => x - 1
            )
          )
        )
      )
    )
    expect(lensed.get() === a.a.b + 1).toBeTruthy()
  })
})

describe('prop', () => {
  testBasic((prop) => pipe(_.of({ prop }), _.prop('prop')))
  testEq((initial, source, eq) =>
    pipe(
      _.make(
        getOrElse(() => ({ prop: initial })),
        pipe(
          source,
          ro.map((v) => ({ prop: v }))
        ),
        pipe(
          eq,
          contramap((a) => a.prop)
        )
      ),
      _.prop('prop')
    )
  )
})

describe('key', () => {
  it('some', () => {
    const a = ctorValue()
    const root = _.of<ReadonlyRecord<string, TestStruct>>({
      a,
    })
    const child = pipe(root, _.key('a'))
    expect((child.get() as Some<TestStruct>).value).toBe(a)
  })
  it('none', () => {
    const root = _.of<ReadonlyRecord<string, TestStruct>>({})
    const child = pipe(root, _.key('b'))
    expect(child.get()).toEqual(none)
  })
})

describe('index', () => {
  it('some', () => {
    const a = ctorValue()
    const root = _.of<readonly TestStruct[]>([a])
    const child = pipe(root, _.index(0))
    expect((child.get() as Some<TestStruct>).value).toBe(a)
  })
  it('none', () => {
    const root = _.of<readonly TestStruct[]>([])
    const child = pipe(root, _.index(0))
    expect(child.get()).toEqual(none)
  })
})

describe('withDefault', () => {
  testBasic((prop) =>
    pipe(
      _.of<ReadonlyRecord<string, TestStruct>>({}),
      _.key('prop'),
      _.withDefault(() => prop)
    )
  )
  testEq((initial, source, eq) =>
    pipe(
      _.make<ReadonlyRecord<string, TestStruct>>(
        getOrElse(() => ({})),
        pipe(
          source,
          ro.map((v) => ({ prop: v }))
        ),
        pipe(
          eq,
          contramap((a) => a.prop ?? initial)
        )
      ),
      _.key('prop'),
      _.withDefault(() => initial)
    )
  )
})

describe('distinct', () => {
  testEq((initial, source, eq) =>
    pipe(
      _.make(
        getOrElse(() => initial),
        source,
        eqStrict
      ),
      _.distinct(eq)
    )
  )
})

describe('chain', () => {
  testBasic((v) =>
    pipe(
      _.of(1),
      _.chain(() => _.of(v))
    )
  )
  testEq((initial, source, eq) =>
    pipe(
      _.of(1),
      _.chain(() =>
        _.make(
          getOrElse(() => initial),
          source,
          eq
        )
      )
    )
  )
  describe('provides argument', () => {
    beforeEach(() => jest.useFakeTimers())
    it('w/o subscription', () => {
      const makeInner = jest.fn((n: number) => _.of(n))
      const a = Math.random()
      const atom = pipe(_.of(a), _.chain(makeInner))
      expect(atom.get()).toBe(a)
      expect(makeInner).toHaveBeenCalledTimes(1)
      expect(makeInner).toHaveBeenLastCalledWith(a)
    })
    it(
      'with subscription',
      fakeSchedulers((advance) => {
        const makeInner = jest.fn((n: number) => _.of(n + 1))
        const a = 543
        const atom = pipe(
          _.make(() => a, timer(1000), eqStrict),
          _.chain(makeInner)
        )
        const next = jest.fn()
        atom.subscribe(next)
        expect(makeInner).toHaveBeenCalledTimes(1)
        expect(makeInner).toHaveBeenLastCalledWith(a)
        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenLastCalledWith(a + 1)
        advance(999)
        expect(makeInner).toHaveBeenCalledTimes(1)
        expect(makeInner).toHaveBeenLastCalledWith(a)
        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenLastCalledWith(a + 1)
        advance(1000)
        expect(makeInner).toHaveBeenCalledTimes(2)
        expect(makeInner).toHaveBeenLastCalledWith(0)
        expect(next).toHaveBeenCalledTimes(2)
        expect(next).toHaveBeenLastCalledWith(1)
      })
    )
  })
})

describe('flatten', () => {
  testBasic((v) => pipe(_.of(_.of(v)), _.flatten))
  testEq((initial, source, eq) =>
    pipe(
      _.of(
        _.make(
          getOrElse(() => initial),
          source,
          eq
        )
      ),
      _.flatten
    )
  )
})
