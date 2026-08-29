import type { Fleet, SessionTree } from "@antumbra/contract";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { watchSessionTree } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";
import { useFeed } from "#hooks/feed.ts";
import { cn } from "#lib/utils.ts";
import { SessionMessage } from "#views/session-message.tsx";
import { SessionTreePanel } from "#views/session-tree.tsx";
import { TranscriptView } from "#views/transcript.tsx";

const roleOf = (fleet: Fleet | undefined, sessionId: string): string =>
	fleet?.agents.find((agent) =>
		agent.sessions.some((session) => session.id === sessionId),
	)?.role ?? "unknown agent";

const nameOf = (tree: SessionTree | undefined, sessionId: string): string =>
	tree?.nodes.find((node) => node.id === sessionId)?.displayName ?? "";

// why: the transcript opens beside the roster rather than in place of it, so
// reading one agent never costs the reader sight of the rest of the fleet.
//
// why: the pane is mounted per root Session, so the branch a reader was in is
// forgotten when they move to another Session — a node id means nothing under
// a different root. Words are sent to the root and only the root: a subsession
// is a conversation its parent is holding, and nothing outside may speak into
// one.
//
// why: a pane with nothing to close back to is not beside anything — it is the
// surface it was given, so it fills that surface and offers no close instead of
// hugging a rail that is not there.
export const SessionPane = ({
	fleet,
	onClose,
	onError,
	sessionId,
}: {
	readonly fleet: Fleet | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onError: (message: string) => void;
	readonly sessionId: string;
}) => {
	const [reading, setReading] = useState(sessionId);
	const { error: treeError, value: tree } = useFeed<SessionTree>(
		sessionId,
		(onTree, onFeedError) => watchSessionTree(sessionId, onTree, onFeedError),
	);

	return (
		<section
			className={cn(
				"flex min-h-0 flex-col",
				onClose === undefined
					? "min-w-0 flex-1"
					: "w-[38rem] max-w-[55%] shrink-0 border-l border-border",
			)}
		>
			<header className="flex min-w-0 items-center gap-2 border-b border-border px-4 py-2">
				<span className="min-w-0 truncate text-xs font-medium">
					{roleOf(fleet, sessionId)}
				</span>
				{reading === sessionId ? null : (
					<span className="min-w-0 truncate text-xs text-muted-foreground">
						{nameOf(tree, reading)}
					</span>
				)}
				<span className="min-w-0 flex-1 truncate font-mono text-2xs text-muted-foreground">
					{reading}
				</span>
				{onClose === undefined ? null : (
					<Button
						aria-label="Close transcript"
						onClick={onClose}
						size="icon"
						variant="ghost"
					>
						<XIcon />
					</Button>
				)}
			</header>
			<SessionTreePanel
				error={treeError}
				onSelect={setReading}
				rootName={roleOf(fleet, sessionId)}
				selected={reading}
				tree={tree}
			/>
			<TranscriptView
				nodes={tree?.nodes ?? []}
				onOpenNode={setReading}
				sessionId={reading}
			/>
			<SessionMessage fleet={fleet} onError={onError} sessionId={sessionId} />
		</section>
	);
};
