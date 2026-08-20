import type { SessionSummary } from "@antumbra/contract";
import { interruptSession } from "#adapters/trpc.ts";
import { Badge } from "#components/ui/badge.tsx";
import { Button } from "#components/ui/button.tsx";
import { cn } from "#lib/utils.ts";

// why: a session is how the admiral steps in — its row is the whole click
// target for the transcript, and the interrupt sits outside that target so
// opening one never risks stopping it.
export const SessionRow = ({
	onError,
	onSelect,
	selected,
	session,
}: {
	readonly onError: (message: string) => void;
	readonly onSelect: (sessionId: string) => void;
	readonly selected: string | undefined;
	readonly session: SessionSummary;
}) => (
	<div className="flex min-w-0 items-center gap-1">
		<button
			aria-current={session.id === selected ? "true" : undefined}
			className={cn(
				"flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-accent",
				session.id === selected ? "bg-secondary" : undefined,
			)}
			onClick={() => onSelect(session.id)}
			type="button"
		>
			<span className="shrink-0 font-mono text-2xs">
				{session.id.slice(0, 8)}
			</span>
			<span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">
				{session.backend}
			</span>
			{session.canInterrupt ? <Badge variant="success">working</Badge> : null}
			{session.status === "open" ? null : (
				<Badge variant="outline">{session.status}</Badge>
			)}
		</button>
		{session.canInterrupt ? (
			<Button
				onClick={() => interruptSession(session.id, onError)}
				size="sm"
				variant="outline"
			>
				Interrupt
			</Button>
		) : null}
	</div>
);
