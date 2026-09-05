import { Effect } from "effect";

export const initialize = Effect.fn("SessionSend.initialize")(() => Effect.scope)();
