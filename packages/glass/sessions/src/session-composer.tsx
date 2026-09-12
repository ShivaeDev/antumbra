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

export const SessionComposer = (props: {
	readonly api: SessionsApi;
	readonly inputs: InputsClient;
	readonly drafts: Drafts;
	readonly sessionId: string;
	readonly onError: (message: string) => void;
}) => (
	<Live query={props.api.agents.bySession} input={{ sessionId: SessionId.make(props.sessionId) }}>
		{(agent) =>
			agent === null ? (
				<p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">This record is read only</p>
			) : (
				<>
					<div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2 text-xs">
						<span>{agent.standing}</span>
						<SessionActs api={props.api} sessionId={props.sessionId} canSleep={agent.canSleep} canInterrupt={agent.canInterrupt} />
						<AgentSpend api={props.api} agentId={agent.id} />
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
								canSend={agent.canSend}
								canAttachImages={support.imageInput}
								backend={agent.backend ?? ""}
								standing={agent.presence === null ? agent.standing : presenceNote[agent.presence]}
								onError={props.onError}
							/>
						)}
					</Live>
				</>
			)
		}
	</Live>
);
