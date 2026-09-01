import { Context } from "effect";

const WAKE_PATIENCE_MILLIS = 60_000;

export const SessionWakePatience = Context.Reference<number>("@antumbra/sessions/SessionWakePatience", { defaultValue: () => WAKE_PATIENCE_MILLIS });
