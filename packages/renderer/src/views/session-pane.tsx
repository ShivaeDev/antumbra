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

const agentOf = (fleet: Fleet | undefined, sessionId: string): string | undefined =>
	fleet?.agents.find((agent) => agent.sessions.some((session) => session.id === sessionId))?.id;

const roleOf = (fleet: Fleet | undefined, sessionId: string): string =>
	fleet?.agents.find((agent) => agent.sessions.some((session) => session.id === sessionId))?.role ?? "unknown agent";

const presenceOf = (fleet: Fleet | undefined, sessionId: string) =>
	fleet?.agents.flatMap((agent) => agent.sessions).find((session) => session.id === sessionId)?.presence;

const nameOf = (tree: SessionTree | undefined, sessionId: string): string => tree?.nodes.find((node) => node.id === sessionId)?.displayName ?? "";

export const SessionPane = ({
	fleet,
	foldToolCalls,
	onClose,
	onError,
	sessionId,
}: {
	readonly fleet: Fleet | undefined;
	readonly foldToolCalls: boolean;
	readonly onClose?: (() => void) | undefined;
	readonly onError: (message: string) => void;
	readonly sessionId: string;
}) => {
	const [reading, setReading] = useState(sessionId);
	const { error: treeError, value: tree } = useFeed<SessionTree>(sessionId, (onTree, onFeedError) =>
		watchSessionTree(sessionId, onTree, onFeedError),
	);

	return (
		<section
			className={cn("flex min-h-0 flex-col", onClose === undefined ? "min-w-0 flex-1" : "w-[38rem] max-w-[55%] shrink-0 border-l border-border")}
		>
			<header className="flex min-w-0 items-center gap-2 border-b border-border px-4 py-2">
				<span className="min-w-0 truncate text-xs font-medium">{roleOf(fleet, sessionId)}</span>
				{reading === sessionId ? null : <span className="min-w-0 truncate text-xs text-muted-foreground">{nameOf(tree, reading)}</span>}
				<span className="min-w-0 flex-1 truncate font-mono text-2xs text-muted-foreground">{reading}</span>
				{onClose === undefined ? null : (
					<Button aria-label="Close transcript" onClick={onClose} size="icon" variant="ghost">
						<XIcon />
					</Button>
				)}
			</header>
			<SessionTreePanel error={treeError} onSelect={setReading} rootName={roleOf(fleet, sessionId)} selected={reading} tree={tree} />
			<TranscriptView
				agentId={agentOf(fleet, sessionId)}
				foldToolCalls={foldToolCalls}
				nodes={tree?.nodes ?? []}
				onOpenNode={setReading}
				presence={presenceOf(fleet, sessionId)}
				sessionId={reading}
			/>
			<SessionMessage fleet={fleet} onError={onError} sessionId={sessionId} />
		</section>
	);
};
