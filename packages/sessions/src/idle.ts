export const idleSessionsPastThreshold = (idleSince: ReadonlyMap<string, number>, now: number, thresholdMillis: number): ReadonlySet<string> =>
	new Set([...idleSince].flatMap(([sessionId, since]) => (now - since >= thresholdMillis ? [sessionId] : [])));
