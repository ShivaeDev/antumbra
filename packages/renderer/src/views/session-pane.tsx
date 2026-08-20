import type { Fleet } from "@antumbra/contract";
import { XIcon } from "lucide-react";
import { Button } from "#components/ui/button.tsx";
import { SessionMessage } from "#views/session-message.tsx";
import { TranscriptView } from "#views/transcript.tsx";

const roleOf = (fleet: Fleet | undefined, sessionId: string): string =>
	fleet?.agents.find((agent) =>
		agent.sessions.some((session) => session.id === sessionId),
	)?.role ?? "unknown agent";

// why: the transcript opens beside the roster rather than in place of it, so
// reading one agent never costs the reader sight of the rest of the fleet.
export const SessionPane = ({
	fleet,
	onClose,
	onError,
	sessionId,
}: {
	readonly fleet: Fleet | undefined;
	readonly onClose: () => void;
	readonly onError: (message: string) => void;
	readonly sessionId: string;
}) => (
	<section className="flex min-h-0 w-[38rem] max-w-[55%] shrink-0 flex-col border-l border-border">
		<header className="flex min-w-0 items-center gap-2 border-b border-border px-4 py-2">
			<span className="min-w-0 truncate text-xs font-medium">
				{roleOf(fleet, sessionId)}
			</span>
			<span className="min-w-0 flex-1 truncate font-mono text-2xs text-muted-foreground">
				{sessionId}
			</span>
			<Button
				aria-label="Close transcript"
				onClick={onClose}
				size="icon"
				variant="ghost"
			>
				<XIcon />
			</Button>
		</header>
		<TranscriptView sessionId={sessionId} />
		<SessionMessage fleet={fleet} onError={onError} sessionId={sessionId} />
	</section>
);
