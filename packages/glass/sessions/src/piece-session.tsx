import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import type { ReactNode } from "react";
import { AgentSession } from "#agent-session.tsx";
import type { SessionsApi } from "#glass.ts";
import { PaneNote } from "#session-pane.tsx";

type Agent = typeof agentReading.Row.Type;

const NO_CREW = "No agent is working this piece yet";

const crewing = (agents: readonly Agent[]): Agent | undefined => {
	let latest: Agent | undefined;
	for (const agent of agents) {
		if (latest === undefined || agent.createdAt > latest.createdAt) latest = agent;
	}
	return latest;
};

export const PieceSession = (props: {
	readonly api: SessionsApi;
	readonly pieceId: string;
	readonly renderSession: (sessionId: string) => ReactNode;
}) => (
	<Live input={{ pieceId: PieceId.make(props.pieceId) }} query={props.api.agents.byPiece} waiting="Reading the crew…">
		{(agents) => {
			const crew = crewing(agents);
			if (crew === undefined) return <PaneNote>{NO_CREW}</PaneNote>;
			return <AgentSession api={props.api} agentId={crew.id} renderSession={props.renderSession} />;
		}}
	</Live>
);
