// why: the clock decides, never the Agent. Standing down marks the moment;
// this pure reading receives the chosen threshold, so policy is read once by
// the pass and every Session in that pass is judged the same way.
export const idleSessionsPastThreshold = (
	idleSince: ReadonlyMap<string, number>,
	now: number,
	thresholdMillis: number,
): ReadonlySet<string> =>
	new Set(
		[...idleSince].flatMap(([sessionId, since]) =>
			now - since >= thresholdMillis ? [sessionId] : [],
		),
	);
