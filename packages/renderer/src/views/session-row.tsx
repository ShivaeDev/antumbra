import type { SessionSummary } from "@antumbra/contract";
import { SquareArrowOutUpRightIcon } from "lucide-react";
import { interruptSession, sleepSession } from "#adapters/trpc.ts";
import { openWindow } from "#adapters/trpc-windows.ts";
import { Badge } from "#components/ui/badge.tsx";
import { Button } from "#components/ui/button.tsx";
import { cn } from "#lib/utils.ts";
import { presenceWords } from "#views/session-presence-words.ts";

// why: working and stranded are tinted. Listening and asleep are the ordinary
// quiet of a fleet between tasks, and colouring them would spend the reader's
// attention on rows that want nothing from them — while a stranded session has
// work nobody is doing, which is exactly what wants the attention.
const PRESENCE: Record<
	SessionSummary["presence"],
	React.ComponentProps<typeof Badge>["variant"]
> = {
	asleep: "outline",
	ended: "outline",
	idle: "secondary",
	stranded: "warning",
	working: "success",
};

// why: a session is how the admiral steps in — its row is the whole click
// target for the transcript beside the roster, and the acts sit outside that
// target so opening one never risks stopping it.
//
// why: a transcript worth watching is worth watching beside the work, so a
// session can also be given a window of its own. Main decides whether one is
// minted; asking twice for the same session brings the first one forward.
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
			<Badge variant={PRESENCE[session.presence]}>
				{presenceWords[session.presence]}
			</Badge>
		</button>
		<Button
			aria-label="Open in a window"
			className="text-muted-foreground"
			onClick={() =>
				openWindow({ role: "transcript", sessionId: session.id }, onError)
			}
			size="icon"
			variant="ghost"
		>
			<SquareArrowOutUpRightIcon />
		</Button>
		{session.canInterrupt ? (
			<Button
				onClick={() => interruptSession(session.id, onError)}
				size="sm"
				variant="outline"
			>
				Interrupt
			</Button>
		) : null}
		{/* why: no confirmation. Rest is undone by speaking to the Session, so
		    asking twice would guard against nothing — and the act is offered only
		    when the whole tree is at rest, which is the guard that matters. */}
		{session.canSleep ? (
			<Button
				onClick={() => sleepSession(session.id, onError)}
				size="sm"
				variant="outline"
			>
				Sleep
			</Button>
		) : null}
	</div>
);
