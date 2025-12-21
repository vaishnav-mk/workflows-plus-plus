import { Effect, Exit } from "effect";

export function runPromise<A, E>(
  effect: Effect.Effect<A, E, never>
): Promise<A> {
  return Effect.runPromise(effect);
}

export function runPromiseExit<A, E>(
  effect: Effect.Effect<A, E, never>
): Promise<Exit.Exit<A, E>> {
  return Effect.runPromiseExit(effect);
}
