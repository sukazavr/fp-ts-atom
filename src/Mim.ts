/** @since 1.0.0 */
import { Eq } from 'fp-ts/Eq'
import { isNone, none, Option, some } from 'fp-ts/Option'
import { noop, Observable, Subject, Subscriber, Subscription } from 'rxjs'

/**
 * @since 1.0.0
 * @category Classes
 */
export class Mim<T> extends Subject<T> {
  /** @since 1.0.0 */
  public readonly eq: Eq<T>

  private readonly _evaluate: (prev: Option<T>) => T
  private readonly _source: Observable<T>
  private _prev: Option<T> = none
  private _refCount = 0
  private _subscription?: Subscription

  constructor(
    evaluate: (prev: Option<T>) => T,
    source: Observable<T>,
    eq: Eq<T>
  ) {
    super()
    this.eq = eq
    this._evaluate = evaluate
    this._source = source
  }

  /** @since 1.0.0 */
  protected _subscribe(subscriber: Subscriber<T>): Subscription {
    if (!this._subscription) {
      this._subscription = this._source.subscribe({
        next: this.setValue,
        error: noop,
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

  private readonly setPrev = (value: T): T => {
    this._prev = some(value)
    return value
  }

  /** @since 1.0.0 */
  public readonly getValue = (): T => {
    if (isNone(this._prev)) {
      return this.setPrev(this._evaluate(none))
    } else {
      if (this._subscription) {
        return this._prev.value
      } else {
        const next = this._evaluate(this._prev)
        if (this.eq.equals(this._prev.value, next)) {
          return this._prev.value
        } else {
          return this.setPrev(next)
        }
      }
    }
  }

  /** @since 1.0.0 */
  public readonly setValue = (next: T): void => {
    if (!this.eq.equals(this.getValue(), next)) {
      super.next(this.setPrev(next))
    }
  }

  /** @since 1.0.0 */
  public unsubscribe = (): void => {
    if (this._subscription) {
      this._subscription.unsubscribe()
      this._subscription = undefined
    }
    this._refCount = 0
    super.unsubscribe()
  }
}
