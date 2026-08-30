import { Context } from "effect";

// why: generous enough that a real resume — a provider session opened, its own
// storage read back for work that ended while nothing was listening — finishes
// well inside it, and short enough that a wake nobody can complete says so
// while the admiral is still watching for it.
export const WAKE_PATIENCE_MILLIS = 60_000;

// why: a bound measured in a minute is a bound no rehearsal can wait out, and
// one that is never rehearsed is a claim rather than a guarantee. The default
// is the shipped policy and nothing has to provide it; a rehearsal overrides it
// to watch the same unwinding happen in a tenth of a second.
export const SessionWakePatience = Context.Reference<number>("@antumbra/sessions/SessionWakePatience", { defaultValue: () => WAKE_PATIENCE_MILLIS });
