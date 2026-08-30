import type { SessionSummary } from "@antumbra/contract";
import { SessionRow } from "#views/session-row.tsx";

export const AgentSessions = ({
	onError,
	onSelect,
	selected,
	sessions,
}: {
	readonly onError: (message: string) => void;
	readonly onSelect: (sessionId: string) => void;
	readonly selected: string | undefined;
	readonly sessions: ReadonlyArray<SessionSummary>;
}) =>
	sessions.length === 0 ? null : (
		<div className="flex min-w-0 flex-col gap-0.5">
			{sessions.map((session) => (
				<SessionRow key={session.id} onError={onError} onSelect={onSelect} selected={selected} session={session} />
			))}
		</div>
	);
