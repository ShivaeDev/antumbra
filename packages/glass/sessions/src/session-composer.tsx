import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { SessionSituations } from "@antumbra/glass-changes/session-situations.tsx";
import { Live } from "@antumbra/glass-client/live.tsx";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import type { Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { SessionMessage } from "@antumbra/glass-inputs/session-message.tsx";
import type { SessionsApi } from "#glass.ts";
import { presenceNote } from "#presence.ts";
import { SessionActs } from "#session-acts.tsx";
import { AgentSpend } from "#spend.tsx";

interface Props {
	readonly api: SessionsApi;
	readonly inputs: InputsClient;
	readonly drafts: Drafts;
	readonly sessionId: string;
	readonly onError: (message: string) => void;
}

const CurrentComposer = (props: Props & { readonly agent: typeof agentReading.Row.Type }) => (
	<>
		<div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2 text-xs">
			<span>{props.agent.standing}</span>
			<SessionActs api={props.api} sessionId={props.sessionId} canSleep={props.agent.canSleep} canInterrupt={props.agent.canInterrupt} />
			<AgentSpend api={props.api} agentId={props.agent.id} />
		</div>
		<SessionSituations
			key={props.sessionId}
			api={props.api}
			inputs={props.inputs}
			drafts={props.drafts}
			sessionId={props.sessionId}
			onError={props.onError}
		/>
		<Live query={props.api.inputs.support} input={{ sessionId: SessionId.make(props.sessionId) }}>
			{(support) => (
				<SessionMessage
					api={props.inputs}
					drafts={props.drafts}
					sessionId={props.sessionId}
					canSend={props.agent.canSend}
					canAttachImages={support.imageInput}
					backend={props.agent.backend ?? ""}
					standing={props.agent.presence === null ? props.agent.standing : presenceNote[props.agent.presence]}
					onError={props.onError}
				/>
			)}
		</Live>
	</>
);

export const SessionComposer = (props: Props) => (
	<Live query={props.api.agents.bySession} input={{ sessionId: SessionId.make(props.sessionId) }}>
		{(agent) =>
			agent === null ? (
				<p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">This record is read only</p>
			) : (
				<CurrentComposer {...props} agent={agent} />
			)
		}
	</Live>
);
