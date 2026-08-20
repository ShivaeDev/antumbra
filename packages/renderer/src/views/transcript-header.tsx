// why: the transcript is reached from a list of sessions that all look alike,
// so the pane says which one is open, in the stored form of the id, and how
// much of it there is to read.
export const TranscriptHeader = ({
	count,
	sessionId,
}: {
	readonly count: number;
	readonly sessionId: string;
}) => (
	<header className="flex shrink-0 items-baseline gap-2 border-b border-border px-4 py-2">
		<h2 className="shrink-0 text-xs">transcript</h2>
		<span
			className="min-w-0 truncate font-mono text-2xs text-muted-foreground"
			title={sessionId}
		>
			{sessionId}
		</span>
		<span className="ml-auto shrink-0 text-2xs text-muted-foreground">
			{count === 1 ? "1 event" : `${count} events`}
		</span>
	</header>
);
