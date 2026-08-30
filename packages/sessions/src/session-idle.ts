// why: the one number in the lifecycle, named rather than configured. How long
// a listening Agent is worth a held process is a product judgement, not a knob
// the admiral is asked to turn — and a per-Agent policy would have to be
// defended per Agent. An hour is long enough that a conversation resumed after
// a break costs nothing, and short enough that a fleet left overnight is not
// still holding a process for each of them by morning.
export const IDLE_SIESTA_AFTER_MILLIS = 60 * 60 * 1000;

// why: the clock decides, never the Agent. Standing down marks the moment;
// this is the only reading of that mark, so the threshold cannot be applied
// two ways.
export const idleSessionsPastThreshold = (
	idleSince: ReadonlyMap<string, number>,
	now: number,
): ReadonlySet<string> =>
	new Set(
		[...idleSince].flatMap(([sessionId, since]) =>
			now - since >= IDLE_SIESTA_AFTER_MILLIS ? [sessionId] : [],
		),
	);
