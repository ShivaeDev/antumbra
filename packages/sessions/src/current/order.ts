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

// why: SQLite's datetime default has whole-second precision, so id is the
// stable non-product-priority tiebreaker when Sessions are born together.
export const newestSession = <Session extends SessionAge>(
	sessions: ReadonlyArray<Session>,
): Session | undefined => sessions.toSorted(newestFirst)[0];
