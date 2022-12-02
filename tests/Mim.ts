/* eslint-disable @typescript-eslint/no-unused-vars */
import { eqStrict } from 'fp-ts/Eq'
import { getOrElse, none, Option, some } from 'fp-ts/Option'
import { EMPTY, interval, map, mapTo, NEVER, noop, Observable, of } from 'rxjs'
import { fakeSchedulers } from 'rxjs-marbles/jest'
import { Mim } from '../src/Mim'

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(noop)
})

type TestStruct = { n: number }
const gen = (): TestStruct => ({ n: Math.random() })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const history = (m: jest.Mock<TestStruct, any>, t: number) =>
  m.mock.results[m.mock.results.length - t]?.value
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getNs = (m: jest.Mock<TestStruct, any>) =>
  m.mock.calls.map(([{ n }]) => n)

const runAllTests = (
  ctorMim: (
    evaluate: jest.Mock<TestStruct, [Option<TestStruct>]>,
    source: Observable<TestStruct>
  ) => Mim<TestStruct>,
  genEquals: (prev: Option<TestStruct>) => TestStruct
) => {
  const a: TestStruct = gen()
  describe('w/o subscription', () => {
    it('is lazy', () => {
      const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
        (_prev) => a
      )
      ctorMim(evaluate, of(a))
      expect(evaluate).toHaveBeenCalledTimes(0)
    })
    it('should evaluate first value', () => {
      const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
        (_prev) => a
      )
      const x = ctorMim(evaluate, of(a))
      expect(x.getValue()).toBe(a)
      expect(evaluate).toHaveBeenCalledTimes(1)
      expect(evaluate).toHaveBeenLastCalledWith(none)
    })
    it('should have prev value', () => {
      const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
        getOrElse(gen)
      )
      const x = ctorMim(evaluate, of(a))
      expect(x.getValue()).toBe(history(evaluate, 1))
      expect(evaluate).toHaveBeenCalledTimes(1)
      expect(evaluate).toHaveBeenLastCalledWith(none)
      expect(x.getValue()).toBe(history(evaluate, 2))
      expect(evaluate).toHaveBeenCalledTimes(2)
      expect(evaluate).toHaveBeenLastCalledWith(some(history(evaluate, 2)))
    })
    it('should evaluate next values', () => {
      const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
        (_prev) => gen()
      )
      const x = ctorMim(evaluate, of(a))
      expect(x.getValue()).toBe(history(evaluate, 1))
      expect(evaluate).toHaveBeenCalledTimes(1)
      expect(evaluate).toHaveBeenLastCalledWith(none)
      expect(x.getValue()).toBe(history(evaluate, 1))
      expect(evaluate).toHaveBeenCalledTimes(2)
      expect(evaluate).toHaveBeenLastCalledWith(some(history(evaluate, 2)))
      expect(x.getValue()).toBe(history(evaluate, 1))
      expect(evaluate).toHaveBeenCalledTimes(3)
      expect(evaluate).toHaveBeenLastCalledWith(some(history(evaluate, 2)))
    })
    it('should evaluate after setValue no equals', () => {
      const b: TestStruct = genEquals(none)
      const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
        (_prev) => gen()
      )
      const x = ctorMim(evaluate, of(a))
      expect(x.setValue(b)).not.toBeDefined()
      expect(evaluate).toHaveBeenCalledTimes(1)
      expect(evaluate).toHaveBeenLastCalledWith(none)
      expect(x.getValue()).toBe(history(evaluate, 1))
      expect(evaluate).toHaveBeenCalledTimes(2)
      expect(evaluate).toHaveBeenLastCalledWith(some(b))
    })
    it('should evaluate after setValue equals', () => {
      const c: TestStruct = genEquals(none)
      const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
        (_prev) => gen()
      )
      const x = ctorMim(evaluate, of(a))
      expect(x.setValue(c)).not.toBeDefined()
      expect(evaluate).toHaveBeenCalledTimes(1)
      expect(evaluate).toHaveBeenLastCalledWith(none)
      evaluate.mockImplementation(genEquals)
      // it evaluates but returns prev value coz they are equal
      expect(x.getValue()).toBe(c)
      expect(evaluate).toHaveBeenCalledTimes(2)
      expect(evaluate).toHaveBeenLastCalledWith(some(c))
      // it evaluates current and skips set coz next value is equal to prev
      const d: TestStruct = genEquals(some(c))
      expect(x.setValue(d)).not.toBeDefined()
      expect(evaluate).toHaveBeenCalledTimes(3)
      expect(evaluate).toHaveBeenLastCalledWith(some(c))
      // it evaluates but returns prev value coz they are equal
      expect(x.getValue()).toBe(c)
      expect(evaluate).toHaveBeenCalledTimes(4)
      expect(evaluate).toHaveBeenLastCalledWith(some(c))
    })
  })

  describe('with subscription', () => {
    beforeEach(() => jest.useFakeTimers())
    it(
      'should evaluate lazy',
      fakeSchedulers((advance) => {
        const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
          (_prev) => gen()
        )
        const x = ctorMim(evaluate, NEVER)
        const next = jest.fn()
        expect(evaluate).toHaveBeenCalledTimes(0)
        x.subscribe(next)
        expect(evaluate).toHaveBeenCalledTimes(1)
        expect(evaluate).toHaveBeenLastCalledWith(none)
        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenLastCalledWith(history(evaluate, 1))
        advance(100)
        expect(evaluate).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenCalledTimes(1)
        advance(10000)
        expect(evaluate).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenCalledTimes(1)
      })
    )
    it(
      'should evaluate once',
      fakeSchedulers((advance) => {
        const b = gen()
        const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
          (_prev) => gen()
        )
        const x = ctorMim(
          evaluate,
          interval(100).pipe(map((i) => (i % 2 ? b : a)))
        )
        const next = jest.fn()
        x.subscribe(next)
        x.subscribe()
        x.subscribe()
        expect(evaluate).toHaveBeenCalledTimes(1)
        expect(evaluate).toHaveBeenLastCalledWith(none)
        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenLastCalledWith(history(evaluate, 1))
        advance(100)
        expect(evaluate).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenCalledTimes(2)
        expect(next).toHaveBeenLastCalledWith(a)
        advance(50)
        expect(evaluate).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenCalledTimes(2)
        advance(50)
        expect(evaluate).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenCalledTimes(3)
        expect(next).toHaveBeenLastCalledWith(b)
      })
    )
    it(
      'should emit values from source and on setValue',
      fakeSchedulers((advance) => {
        const b = genEquals(none)
        const c = gen()
        const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
          (_prev) => gen()
        )
        const x = ctorMim(evaluate, interval(100).pipe(mapTo(c)))
        const next = jest.fn()
        x.subscribe(next)
        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenLastCalledWith(history(evaluate, 1))
        x.setValue(a)
        expect(next).toHaveBeenCalledTimes(2)
        expect(next).toHaveBeenLastCalledWith(a)
        advance(50)
        x.setValue(b)
        expect(next).toHaveBeenCalledTimes(3)
        expect(next).toHaveBeenLastCalledWith(b)
        advance(50)
        expect(next).toHaveBeenCalledTimes(4)
        expect(next).toHaveBeenLastCalledWith(c)
        x.setValue(b)
        expect(next).toHaveBeenCalledTimes(5)
        expect(next).toHaveBeenLastCalledWith(b)
        // should evaluate once on the first subscribe
        expect(evaluate).toHaveBeenCalledTimes(1)
      })
    )
    it(
      'should distinct values',
      fakeSchedulers((advance) => {
        const b = genEquals(none)
        const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
          (_prev) => b
        )
        const x = ctorMim(evaluate, interval(100).pipe(mapTo(b)))
        const next = jest.fn()
        x.subscribe(next)
        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenLastCalledWith(b)
        x.setValue(b)
        expect(next).toHaveBeenCalledTimes(1)
        advance(50)
        x.setValue(b)
        expect(next).toHaveBeenCalledTimes(1)
        advance(50)
        expect(next).toHaveBeenCalledTimes(1)
        x.setValue(b)
        expect(next).toHaveBeenCalledTimes(1)
        advance(100)
        expect(next).toHaveBeenCalledTimes(1)
        advance(1000)
        expect(next).toHaveBeenCalledTimes(1)
        expect(x.getValue()).toBe(b)
        expect(next).toHaveBeenCalledTimes(1)
        // should evaluate once on the first subscribe
        expect(evaluate).toHaveBeenCalledTimes(1)
      })
    )
    it(
      'should return current value from getValue inside next cb',
      fakeSchedulers((advance) => {
        let isExpectedFromEvaluate = true
        const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
          (_prev) => gen()
        )
        const makeSourceValue: jest.Mock<TestStruct, []> = jest.fn(gen)
        const x = ctorMim(evaluate, interval(100).pipe(map(makeSourceValue)))
        const next = jest.fn(() => {
          const value = history(
            isExpectedFromEvaluate ? evaluate : makeSourceValue,
            1
          )
          expect(x.getValue()).toBe(value)
          expect(evaluate).toHaveBeenCalledTimes(1)
        })
        x.subscribe(next)
        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenLastCalledWith(history(evaluate, 1))
        expect(makeSourceValue).toHaveBeenCalledTimes(0)
        isExpectedFromEvaluate = false
        advance(1000)
        expect(makeSourceValue).toHaveBeenCalledTimes(10)
        expect(next).toHaveBeenCalledTimes(11)
        expect(next).toHaveBeenLastCalledWith(history(makeSourceValue, 1))
        expect(x.getValue()).toBe(history(makeSourceValue, 1))
        expect(evaluate).toHaveBeenCalledTimes(1)
      })
    )
    it(
      'should work with multiple subscriptions',
      fakeSchedulers((advance) => {
        const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
          (_prev) => ({ n: 0 })
        )
        const x = ctorMim(
          evaluate,
          interval(100).pipe(map((i) => ({ n: i + 10 })))
        )
        const next1 = jest.fn()
        const next2 = jest.fn()
        x.subscribe(next1)
        x.subscribe(next2)
        expect(next1).toHaveBeenCalledTimes(1)
        expect(next1.mock.calls).toEqual(next2.mock.calls)
        advance(300)
        expect(next1).toHaveBeenCalledTimes(4)
        expect(next1.mock.calls).toEqual(next2.mock.calls)
        advance(7)
        x.setValue({ n: 54 })
        expect(next1).toHaveBeenCalledTimes(5)
        expect(next1.mock.calls).toEqual(next2.mock.calls)
        expect(getNs(next1)).toEqual([0, 10, 11, 12, 54])
        // should evaluate once on the first subscribe
        expect(evaluate).toHaveBeenCalledTimes(1)
      })
    )
    it(
      'should restore value on resubscribe',
      fakeSchedulers((advance) => {
        const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
          (_prev) => ({ n: 6.7 })
        )
        const x = ctorMim(
          evaluate,
          interval(100).pipe(map((i) => ({ n: i + 10 })))
        )
        const next = jest.fn()
        const sub1 = x.subscribe(next)
        expect(getNs(next)).toEqual([6.7])
        advance(100)
        expect(getNs(next)).toEqual([6.7, 10])
        sub1.unsubscribe()
        x.setValue({ n: 54 })
        expect(getNs(next)).toEqual([6.7, 10])
        const sub2 = x.subscribe(next)
        expect(getNs(next)).toEqual([6.7, 10, 54])
        sub2.unsubscribe()
        expect(getNs(next)).toEqual([6.7, 10, 54])
        // should evaluate on the first subscribe and on the set
        expect(evaluate).toHaveBeenCalledTimes(2)
      })
    )
    it(
      'should have only one subscription for source',
      fakeSchedulers((advance) => {
        const subscribe = jest.fn()
        const unsubscribe = jest.fn()
        const x = ctorMim(
          jest.fn(),
          new Observable(() => {
            subscribe()
            return unsubscribe
          })
        )
        x.subscribe()
        expect(subscribe).toHaveBeenCalledTimes(1)
        expect(unsubscribe).toHaveBeenCalledTimes(0)
        advance(100)
        expect(subscribe).toHaveBeenCalledTimes(1)
        expect(unsubscribe).toHaveBeenCalledTimes(0)
        x.subscribe()
        x.subscribe()
        expect(subscribe).toHaveBeenCalledTimes(1)
        expect(unsubscribe).toHaveBeenCalledTimes(0)
      })
    )
    it(
      'should unsubscribe from source when is has no subscribers',
      fakeSchedulers((advance) => {
        const subscribe = jest.fn()
        const unsubscribe = jest.fn()
        const x = ctorMim(
          jest.fn(),
          new Observable(() => {
            subscribe()
            return unsubscribe
          })
        )
        const sub1 = x.subscribe()
        const sub2 = x.subscribe()
        expect(subscribe).toHaveBeenCalledTimes(1)
        expect(unsubscribe).toHaveBeenCalledTimes(0)
        advance(100)
        sub1.unsubscribe()
        sub2.unsubscribe()
        expect(subscribe).toHaveBeenCalledTimes(1)
        expect(unsubscribe).toHaveBeenCalledTimes(1)
        x.subscribe().unsubscribe()
        expect(subscribe).toHaveBeenCalledTimes(2)
        expect(unsubscribe).toHaveBeenCalledTimes(2)
      })
    )
    it(
      'should ignore when source errors',
      fakeSchedulers((advance) => {
        const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
          (_prev) => ({ n: 6.7 })
        )
        const x = ctorMim(
          evaluate,
          new Observable(() => {
            throw new Error('test')
          })
        )
        const next = jest.fn()
        x.subscribe(next)
        expect(getNs(next)).toEqual([6.7])
        advance(100)
        expect(getNs(next)).toEqual([6.7])
        x.setValue({ n: 63 })
        expect(getNs(next)).toEqual([6.7, 63])
      })
    )
    it(
      'should ignore when source completes without value',
      fakeSchedulers((advance) => {
        const evaluate: jest.Mock<TestStruct, [Option<TestStruct>]> = jest.fn(
          (_prev) => ({ n: 6.7 })
        )
        const x = ctorMim(evaluate, EMPTY)
        const next = jest.fn()
        x.subscribe(next)
        expect(getNs(next)).toEqual([6.7])
        advance(100)
        expect(getNs(next)).toEqual([6.7])
        x.setValue({ n: 63 })
        expect(getNs(next)).toEqual([6.7, 63])
      })
    )
  })
}

describe('equals strict', () => {
  const v: TestStruct = { n: 1 }
  runAllTests(
    (evaluate, source) => new Mim(evaluate, source, eqStrict),
    () => v
  )
})

describe('equals custom', () => {
  runAllTests(
    (evaluate, source) =>
      new Mim(evaluate, source, {
        equals: (a, b) => a.n >= 100 && b.n >= 100,
      }),
    () => ({ n: Math.random() + 100 })
  )
})
