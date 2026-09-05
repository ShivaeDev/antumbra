interface SessionAge {
	readonly createdAt: Date;
	readonly id: string;
}

const newestFirst = (left: SessionAge, right: SessionAge) => {
	const byTime = right.createdAt.getTime() - left.createdAt.getTime();
	if (byTime !== 0) {
		return byTime;
	}
	if (left.id === right.id) {
		return 0;
	}
	return left.id < right.id ? 1 : -1;
};

// SQLite timestamps have whole-second precision, so ids make ties deterministic.
export const newestSession = <Session extends SessionAge>(sessions: ReadonlyArray<Session>): Session | undefined => {
	let newest: Session | undefined;
	for (const session of sessions) {
		if (newest === undefined || newestFirst(session, newest) < 0) {
			newest = session;
		}
	}
	return newest;
};
