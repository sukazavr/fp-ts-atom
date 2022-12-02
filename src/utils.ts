import type { Eq } from 'fp-ts/Eq'
import { pipe } from 'fp-ts/function'
import { chain, getOrElse, none, Option, some } from 'fp-ts/Option'

/**
 * It memorizes only one value (input/output) at a time. Be aware of where/when
 * you call the constructor of the `memoize` function, it determines the closure
 * between memory state and `memoize` function
 *
 * @since 3.0.0
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const ctorMemoizeOnce = () => {
  let memory: Option<{ input: unknown; output: unknown }> = none
  return <A>(eqInput: Eq<A>) =>
    <B>(f: (inputN: A) => B) =>
    (inputN: A): B =>
      pipe(
        memory as Option<{ input: A; output: B }>,
        chain(({ input, output }) =>
          eqInput.equals(input, inputN) ? some(output) : none
        ),
        getOrElse(() => {
          const output = f(inputN)
          memory = some({ input: inputN, output })
          return output
        })
      )
}
