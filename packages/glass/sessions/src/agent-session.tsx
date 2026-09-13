import { AgentId } from "@antumbra/domain-agents/ids.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import type { ReactNode } from "react";
import type { SessionsApi } from "#glass.ts";
import { PaneNote } from "#session-pane.tsx";

type Session = typeof session.Row.Type;

interface Props {
	readonly api: SessionsApi;
	readonly agentId: string;
	readonly renderSession: (sessionId: string) => ReactNode;
}

const NOTHING_SAID = "This agent has no conversation to read yet";

export const lastConversation = (sessions: readonly Session[]): Session | undefined => {
	let latest: Session | undefined;
	for (const held of sessions) {
		if (held.parentSessionId !== null) continue;
		if (latest === undefined || held.createdAt > latest.createdAt) latest = held;
	}
	return latest;
};

export const AgentSession = (props: Props) => (
	<Live input={{ id: AgentId.make(props.agentId) }} query={props.api.agents.reading} waiting="Reading the agent…">
		{(agent) => {
			if (agent === null) return <PaneNote>{NOTHING_SAID}</PaneNote>;
			if (agent.currentSessionId !== null) return props.renderSession(agent.currentSessionId);
			return <LastConversation {...props} />;
		}}
	</Live>
);

const LastConversation = (props: Props) => (
	<Live input={{ agentId: props.agentId }} query={props.api.sessions.forAgent} waiting="Reading the conversation…">
		{(sessions) => {
			const last = lastConversation(sessions);
			if (last === undefined) return <PaneNote>{NOTHING_SAID}</PaneNote>;
			return props.renderSession(last.id);
		}}
	</Live>
);
