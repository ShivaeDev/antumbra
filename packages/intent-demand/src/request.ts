import { Effect, Queue } from "effect";

export const makeRequest = (tick: Queue.Queue<void>) => Effect.fn("IntentDemand.request")(() => Queue.offer(tick, undefined).pipe(Effect.asVoid));
