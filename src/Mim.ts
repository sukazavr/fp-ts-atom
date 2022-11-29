/** @since 1.0.0 */
import type { Eq } from 'fp-ts/Eq'
import { isNone, none, Option, some } from 'fp-ts/Option'
import { Observable, Subject, Subscriber, Subscription } from 'rxjs'
import type { Atom } from './Atom'
import type { ReadonlyAtom } from './ReadonlyAtom'

/**
 * @since 1.0.0
 * @category Classes
 */
export class Mim<T> extends Subject<T> {
  /** @since 3.0.0 */
  public evaluate: (prev: Option<T>) => T
  /** @since 3.0.0 */
  public source$: Observable<T>
  /** @since 1.0.0 */
  public eq: Eq<T>

  private _memo: Option<T> = none
  private _refCount = 0
  private _subscription?: Subscription

  constructor(
    evaluate: (prev: Option<T>) => T,
    source$: Observable<T>,
    eq: Eq<T>
  ) {
    super()
    this.evaluate = evaluate
    this.source$ = source$
    this.eq = eq
  }

  protected _subscribe(subscriber: Subscriber<T>): Subscription {
    if (!this._subscription) {
      this._subscription = this.source$.subscribe({
        next: this.setValue,
        error: (err) => {
          // Use square brackets to prevent compiler cutout
          console['error'](`Source of Atom or ReadonlyAtom has errored`, err)
        },
      })
    }
    this._refCount++

    const subMain: Subscription = new Subscription(() => {
      if (--this._refCount <= 0 && this._subscription) {
        this._subscription.unsubscribe()
        this._subscription = undefined
      }
    })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const subBroadcast: Subscription = super._subscribe(subscriber)

    if (!subBroadcast.closed) {
      subscriber.next(this.getValue())
    }

    subMain.add(subBroadcast)
    return subMain
  }

  private readonly setMemo = (value: T): T => {
    this._memo = some(value)
    return value
  }

  /** @since 1.0.0 */
  public readonly getValue = (): T => {
    if (isNone(this._memo)) {
      return this.setMemo(this.evaluate(none))
    } else {
      if (this._subscription) {
        return this._memo.value
      } else {
        const next = this.evaluate(this._memo)
        if (this.eq.equals(this._memo.value, next)) {
          return this._memo.value
        } else {
          return this.setMemo(next)
        }
      }
    }
  }

  /** @since 1.0.0 */
  public readonly setValue = (next: T): void => {
    if (!this.eq.equals(this.getValue(), next)) {
      super.next(this.setMemo(next))
    }
  }

  /** @since 1.0.0 */
  public readonly unsubscribe = (): void => {
    if (this._subscription) {
      this._subscription.unsubscribe()
      this._subscription = undefined
    }
    this._refCount = 0
    super.unsubscribe()
  }
}

/** @since 3.0.0 */
export const protect = <T>(a: Atom<T> | ReadonlyAtom<T>): Mim<T> => {
  if (!(a instanceof Mim)) {
    throw new Error(`One of your Atom or ReadonlyAtom isn't an instance of Mim`)
  }
  return a
}
