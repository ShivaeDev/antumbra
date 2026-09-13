import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { SessionSituations } from "@antumbra/glass-changes/session-situations.tsx";
import { Live } from "@antumbra/glass-client/live.tsx";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import type { Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { SessionMessage } from "@antumbra/glass-inputs/session-message.tsx";
import type { ReactNode } from "react";
import type { SessionsApi } from "#glass.ts";

interface Props {
	readonly api: SessionsApi;
	readonly inputs: InputsClient;
	readonly drafts: Drafts;
	readonly sessionId: string;
	readonly onError: (message: string) => void;
}

const READ_ONLY = "This transcript is read only.";
const ASLEEP = "Asleep. Your message will wake it.";

const Footer = ({ children }: { readonly children: ReactNode }) => (
	<div className="shrink-0 border-t border-border">
		<div className="mx-auto flex max-w-[760px] min-w-0 flex-col gap-2 p-3">{children}</div>
	</div>
);

const CurrentComposer = (props: Props & { readonly agent: typeof agentReading.Row.Type }) => (
	<Footer>
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
					hint={props.agent.state === "asleep" && props.agent.canSend ? ASLEEP : undefined}
					onError={props.onError}
				/>
			)}
		</Live>
	</Footer>
);

export const SessionComposer = (props: Props) => (
	<Live query={props.api.agents.bySession} input={{ sessionId: SessionId.make(props.sessionId) }}>
		{(agent) =>
			agent === null ? (
				<Footer>
					<p className="text-xs text-muted-foreground">{READ_ONLY}</p>
				</Footer>
			) : (
				<CurrentComposer {...props} agent={agent} />
			)
		}
	</Live>
);
