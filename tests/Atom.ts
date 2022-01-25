import { eqStrict } from 'fp-ts/Eq'
import { identity, pipe } from 'fp-ts/function'
import { getOrElse, isSome, none, some } from 'fp-ts/Option'
import { ReadonlyRecord } from 'fp-ts/ReadonlyRecord'
import * as L from 'monocle-ts/Lens'
import { NEVER, noop, Subject } from 'rxjs'
import { fakeSchedulers } from 'rxjs-marbles/jest'
import * as _ from '../src/Atom'
import * as ar from '../src/ReadonlyAtom'

type TestStruct = { a: { b: number } }

const ctorValue = (): TestStruct => ({
  a: { b: Math.round(Math.random() * 100) },
})

const testBasic = (ctorAtom: (v: TestStruct) => _.Atom<TestStruct>) => {
  describe('basic', () => {
    beforeEach(() => jest.useFakeTimers())
    it('has eq', () => {
      const v = ctorValue()
      const a = ctorAtom(v)
      expect(a.eq.equals(v, v)).toBeTruthy()
    })
    it('w/o subscription', () => {
      const a = ctorValue()
      const b = ctorValue()
      const c = ctorValue()
      const atom = ctorAtom(a)
      expect(atom.get()).toBe(a)
      atom.set(b)
      expect(atom.get()).toBe(b)
      atom.set(c)
      expect(atom.get()).toBe(c)
      atom.set(c)
      expect(atom.get()).toBe(c)
    })
    it(
      'with subscription',
      fakeSchedulers((advance) => {
        const a = ctorValue()
        const b = ctorValue()
        const c = ctorValue()
        const atom = ctorAtom(a)
        const next = jest.fn()
        atom.subscribe(next)
        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenLastCalledWith(a)
        advance(100)
        atom.set(b)
        expect(next).toHaveBeenCalledTimes(2)
        expect(next).toHaveBeenLastCalledWith(b)
        atom.set(c)
        expect(next).toHaveBeenCalledTimes(3)
        expect(next).toHaveBeenLastCalledWith(c)
        atom.set(c)
        atom.set(c)
        advance(100)
        atom.set(c)
        expect(next).toHaveBeenCalledTimes(3)
      })
    )
  })
}

describe('isAtom', () => {
  it('should be true', () => {
    expect(_.isAtom(_.of(ctorValue()))).toBeTruthy()
  })
  it('should be false', () => {
    expect(_.isAtom(ar.of(ctorValue()))).toBeFalsy()
    expect(_.isAtom(1)).toBeFalsy()
    expect(_.isAtom({})).toBeFalsy()
    expect(_.isAtom(noop)).toBeFalsy()
    expect(_.isAtom(NEVER)).toBeFalsy()
    expect(_.isAtom(new Subject())).toBeFalsy()
  })
})

describe('make', () => {
  testBasic((v) =>
    _.make(
      getOrElse(() => v),
      NEVER,
      eqStrict
    )
  )

  it('should work with custom eq', () => {
    const a = ctorValue()
    const c = ctorValue()
    const root = _.make(
      getOrElse(() => a),
      NEVER,
      {
        equals: (prev, next) => prev.a.b === next.a.b,
      }
    )
    root.set({ a: { b: a.a.b } })
    expect(root.get()).toBe(a)
    root.set(c)
    expect(root.get()).toBe(c)
  })
})

describe('fromIO', () => {
  testBasic((v) => _.fromIO(() => v))
})

describe('of', () => {
  testBasic((v) => _.of(v))
})

describe('lens', () => {
  testBasic((prop) =>
    pipe(
      _.of({ prop }),
      _.lens(pipe(L.id<{ prop: TestStruct }>(), L.prop('prop')))
    )
  )

  const lensA = pipe(L.id<TestStruct>(), L.prop('a'))

  it('should not mutate the original data structure', () => {
    const a = ctorValue()
    const atom = _.of(a)
    const lensed = pipe(atom, _.lens(lensA))
    lensed.set({ b: 854 })
    expect(atom.get()).not.toBe(a)
    expect(atom.get()).toEqual({ a: { b: 854 } })
  })

  it('should calculate nested value', () => {
    const a = ctorValue()
    const lensed = pipe(
      _.of(a),
      _.lens(
        pipe(
          lensA,
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
    lensed.set(6)
    expect(lensed.get() === 6).toBeTruthy()
  })

  it(
    'should not change own and parent values',
    fakeSchedulers((advance) => {
      const a = ctorValue()
      const atom = _.of(a)
      const lensed = pipe(
        atom,
        _.lens(
          L.lens(
            (x) => x.a.b,
            () => identity
          )
        )
      )
      // w/o subscription
      expect(lensed.get()).toBe(a.a.b)
      lensed.set(6)
      expect(atom.get()).toBe(a)
      expect(lensed.get()).toBe(a.a.b)
      // with subscription
      const next = jest.fn()
      lensed.subscribe(next)
      expect(lensed.get()).toBe(a.a.b)
      advance(100)
      lensed.set(97)
      expect(atom.get()).toBe(a)
      expect(lensed.get()).toBe(a.a.b)
      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenLastCalledWith(a.a.b)
    })
  )

  it('should work with custom eq', () => {
    const a = ctorValue()
    const c = ctorValue()
    const root = _.of(a)
    const child = pipe(
      root,
      _.lens(lensA, {
        equals: (prev, next) => {
          return prev.b === next.b
        },
      })
    )
    child.set({ b: a.a.b })
    expect(child.get()).toBe(a.a)
    expect(root.get()).toBe(a)
    child.set(c.a)
    expect(child.get()).toBe(c.a)
    expect(root.get()).toStrictEqual(c)
  })
})

describe('prop', () => {
  testBasic((prop) => pipe(_.of({ prop }), _.prop('prop')))

  it('should work with custom eq', () => {
    const a = ctorValue()
    const c = ctorValue()
    const root = _.of(a)
    const child = pipe(
      root,
      _.prop('a', {
        equals: (prev, next) => {
          return prev.b === next.b
        },
      })
    )
    child.set({ b: a.a.b })
    expect(child.get()).toBe(a.a)
    expect(root.get()).toBe(a)
    child.set(c.a)
    expect(child.get()).toBe(c.a)
    expect(root.get()).toStrictEqual(c)
  })
})

describe('key', () => {
  const a = ctorValue()
  const b = ctorValue()
  const c = ctorValue()
  it('some', () => {
    const root = _.of<ReadonlyRecord<string, TestStruct>>({
      a,
    })
    const child = pipe(root, _.key('a'))
    expect(child.get()).toEqual(some(a))
    child.set(some(b))
    expect(child.get()).toEqual(some(b))
    child.set(none)
    expect(child.get()).toEqual(some(b))
    expect(root.get()).toEqual({ a: b })
  })
  it('none', () => {
    const root = _.of<ReadonlyRecord<string, TestStruct>>({})
    const child = pipe(root, _.key('b'))
    expect(child.get()).toEqual(none)
    child.set(none)
    expect(child.get()).toEqual(none)
    child.set(some(c))
    expect(child.get()).toEqual(some(c))
    child.set(none)
    expect(child.get()).toEqual(some(c))
    expect(root.get()).toEqual({ b: c })
  })
  it('should work with custom eq', () => {
    const a = ctorValue()
    const b = ctorValue()
    const root = _.of<ReadonlyRecord<string, TestStruct>>({})
    const child = pipe(
      root,
      _.key('name', {
        equals: (prev, next) => {
          return prev.a.b === next.a.b
        },
      })
    )
    child.set(none)
    expect(child.get()).toBe(none)
    child.set(some(a))
    const value1 = child.get()
    expect(isSome(value1) && value1.value === a).toBeTruthy()
    child.set(some({ a: a.a }))
    const value2 = child.get()
    expect(isSome(value2) && value2.value === a).toBeTruthy()
    child.set(some(b))
    const value3 = child.get()
    expect(isSome(value3) && value3.value === b).toBeTruthy()
    child.set(none)
    const value4 = child.get()
    expect(isSome(value4) && value4.value === b).toBeTruthy()
  })
})

describe('index', () => {
  const a = ctorValue()
  const b = ctorValue()
  const c = ctorValue()
  it('some', () => {
    const root = _.of<readonly TestStruct[]>([a])
    const child = pipe(root, _.index(0))
    expect(child.get()).toEqual(some(a))
    child.set(some(b))
    expect(child.get()).toEqual(some(b))
    child.set(none)
    expect(child.get()).toEqual(some(b))
    expect(root.get()).toEqual([b])
  })
  it('none', () => {
    const root = _.of<readonly TestStruct[]>([])
    const child = pipe(root, _.index(0))
    expect(child.get()).toEqual(none)
    child.set(none)
    expect(child.get()).toEqual(none)
    child.set(some(c))
    expect(child.get()).toEqual(none)
    expect(root.get()).toEqual([])
  })
  it('should work with custom eq', () => {
    const a = ctorValue()
    const b = ctorValue()
    const root = _.of<readonly TestStruct[]>([a])
    const child = pipe(
      root,
      _.index(0, {
        equals: (prev, next) => {
          return prev.a.b === next.a.b
        },
      })
    )
    const value1 = child.get()
    expect(isSome(value1) && value1.value === a).toBeTruthy()
    child.set(some({ a: a.a }))
    const value2 = child.get()
    expect(isSome(value2) && value2.value === a).toBeTruthy()
    child.set(some(b))
    const value3 = child.get()
    expect(isSome(value3) && value3.value === b).toBeTruthy()
    child.set(none)
    const value4 = child.get()
    expect(isSome(value4) && value4.value === b).toBeTruthy()
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
  it('should ignore set of default value', () => {
    const a = ctorValue()
    const b = ctorValue()
    const r: ReadonlyRecord<string, TestStruct> = {}
    const root = _.of(r)
    const atom = pipe(
      root,
      _.key('prop'),
      _.withDefault(() => a)
    )
    expect(atom.get()).toBe(a)
    expect(root.get()).toBe(r)
    atom.set(a)
    expect(atom.get()).toBe(a)
    expect(root.get()).toBe(r)
    atom.set(b)
    expect(atom.get()).toBe(b)
    expect(root.get()).toStrictEqual({ prop: b })
  })
  it('should work with custom eq', () => {
    const a = ctorValue()
    const b = ctorValue()
    const r: ReadonlyRecord<string, TestStruct> = {}
    const root = _.of(r)
    const atom = pipe(
      root,
      _.key('name'),
      _.withDefault(() => a, {
        equals: (prev, next) => {
          return prev.a.b === next.a.b
        },
      })
    )
    expect(atom.get()).toBe(a)
    expect(root.get()).toBe(r)
    atom.set(a)
    expect(atom.get()).toBe(a)
    expect(root.get()).toBe(r)
    atom.set({ a: { b: a.a.b } })
    expect(atom.get()).toBe(a)
    expect(root.get()).toBe(r)
    atom.set(b)
    expect(atom.get()).toBe(b)
    expect(root.get()).toStrictEqual({ name: b })
  })
})

describe('distinct', () => {
  it('should distinct', () => {
    const a = ctorValue()
    const c = ctorValue()
    const root = pipe(
      _.of(a),
      _.distinct({
        equals: (prev, next) => prev.a.b === next.a.b,
      })
    )
    root.set({ a: { b: a.a.b } })
    expect(root.get()).toBe(a)
    root.set(c)
    expect(root.get()).toBe(c)
  })
})

describe('toReadonlyAtom', () => {
  it('should convert to ReadonlyAtom', () => {
    expect(pipe(1, _.of, _.toReadonlyAtom, ar.isReadonlyAtom)).toBeTruthy()
  })
})

describe('modify', () => {
  it('should modify', () => {
    const a = ctorValue()
    const b = ctorValue()
    const e = jest.fn(() => b)
    const atom = _.of(a)
    _.modify(e)(atom)
    expect(e).toBeCalledTimes(1)
    expect(e).toBeCalledWith(a)
    expect(atom.get()).toBe(b)
  })
  it('should modifyV', () => {
    const a = ctorValue()
    const b = ctorValue()
    const e = jest.fn(() => b)
    const atom = _.of(a)
    _.modifyV(atom)(e)
    expect(e).toBeCalledTimes(1)
    expect(e).toBeCalledWith(a)
    expect(atom.get()).toBe(b)
  })
})
