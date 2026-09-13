import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import type { ReactNode } from "react";
import { lastConversation } from "#agent-session.tsx";
import type { SessionsApi } from "#glass.ts";
import { PaneNote } from "#session-pane.tsx";

type Agent = typeof agentReading.Row.Type;

interface Props {
	readonly api: SessionsApi;
	readonly pieceId: string;
	readonly renderSession: (sessionId: string) => ReactNode;
}

const NO_CREW = "No agent of this piece has a conversation yet";

const newestFirst = (agents: readonly Agent[]): readonly Agent[] => agents.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt));

export const crewing = (agents: readonly Agent[]): Agent | undefined => {
	for (const agent of newestFirst(agents)) {
		if (agent.currentSessionId !== null) return agent;
	}
	return undefined;
};

export const PieceSession = (props: Props) => (
	<Live input={{ pieceId: PieceId.make(props.pieceId) }} query={props.api.agents.byPiece} waiting="Reading the crew…">
		{(agents) => {
			const crew = crewing(agents);
			if (crew !== undefined && crew.currentSessionId !== null) return props.renderSession(crew.currentSessionId);
			return <SpokenBefore {...props} agents={newestFirst(agents)} />;
		}}
	</Live>
);

const SpokenBefore = (props: Props & { readonly agents: readonly Agent[] }) => {
	const [agent, ...rest] = props.agents;
	if (agent === undefined) return <PaneNote>{NO_CREW}</PaneNote>;
	return (
		<Live input={{ agentId: agent.id }} query={props.api.sessions.forAgent} waiting="Reading the conversation…">
			{(sessions) => {
				const last = lastConversation(sessions);
				if (last === undefined) return <SpokenBefore {...props} agents={rest} />;
				return props.renderSession(last.id);
			}}
		</Live>
	);
};
