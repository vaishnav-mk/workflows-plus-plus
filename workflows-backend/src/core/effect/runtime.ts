/**
 * Effect Runtime Configuration
 * 
 * Note: Effects with requirements (R) need to be provided with runtime/context
 * before running. Use Effect.provide or Effect.provideService to eliminate requirements.
 */

import { Effect, Exit } from "effect";

/**
 * Run an effect as a promise (async)
 * Effect must have no requirements (R = never)
 */
export function runPromise<A, E>(
  effect: Effect.Effect<A, E, never>
): Promise<A> {
  return Effect.runPromise(effect);
}

/**
 * Run an effect and get exit (for error handling)
 * Effect must have no requirements (R = never)
 */
export function runPromiseExit<A, E>(
  effect: Effect.Effect<A, E, never>
): Promise<Exit.Exit<A, E>> {
  return Effect.runPromiseExit(effect);
}

