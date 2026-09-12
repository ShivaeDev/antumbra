import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { session as sessionRow } from "@antumbra/domain-sessions/rows/session.ts";
import type { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { CommandAct } from "@antumbra/glass-components/act.tsx";
import { Badge } from "@antumbra/glass-components/ui/badge.tsx";
import type { SessionsApi } from "#glass.ts";

type Api = Pick<SessionsApi, "agents" | "sessions">;

const BirthDiagnostic = ({ api, sessionId }: { readonly api: Api; readonly sessionId: string }) => (
	<Live query={api.agents.birthBySession} input={{ sessionId: SessionId.make(sessionId) }}>
		{(birth) =>
			birth === null || birth.status === "running" || birth.status === "ended" || birth.status === "cancelled" ? null : (
				<span className="flex items-center gap-1 text-xs">
					<Badge className="font-mono" variant="outline">
						birth · {birth.status}
					</Badge>
					{birth.detail === null ? null : <span>{birth.detail}</span>}
				</span>
			)
		}
	</Live>
);

const OperationDiagnostic = ({ api, operation }: { readonly api: Api; readonly operation: typeof sessionOperation.Row.Type }) => (
	<span className="flex items-center gap-1">
		<Badge className="font-mono" variant="outline">
			{operation.kind} · {operation.status}
		</Badge>
		{operation.detail === null ? null : <span>{operation.detail}</span>}
		{operation.status === "waiting" ? <CommandAct command={api.sessions.retry} input={{ id: operation.id }} label="Retry" /> : null}
	</span>
);

const SessionDiagnostic = ({
	api,
	currentSessionId,
	session,
}: {
	readonly api: Api;
	readonly currentSessionId: string | null;
	readonly session: typeof sessionRow.Row.Type;
}) => (
	<div className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
		<span className="font-mono text-muted-foreground">{session.id}</span>
		<Badge className="font-mono" variant="outline">
			{session.executionStatus}
			{session.id === currentSessionId ? " · current" : ""}
		</Badge>
		<Live query={api.sessions.operations} input={{ sessionId: session.id }}>
			{(operations) =>
				operations
					.filter((operation) => operation.status !== "accepted" && operation.status !== "cancelled")
					.map((operation) => <OperationDiagnostic api={api} operation={operation} key={operation.id} />)
			}
		</Live>
	</div>
);

export const Diagnostics = ({ api, agent }: { readonly api: Api; readonly agent: typeof agentReading.Row.Type }) => (
	<details className="min-w-0 border-t border-border pt-1.5">
		<summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">diagnostics</summary>
		<div className="flex min-w-0 flex-col gap-1 pt-1.5">
			<Badge className="font-mono" variant="outline">
				current {agent.currentSessionId ?? "none"}
			</Badge>
			{agent.currentSessionId === null ? null : <BirthDiagnostic api={api} sessionId={agent.currentSessionId} />}
			<Live query={api.sessions.forAgent} input={{ agentId: agent.id }}>
				{(sessions) =>
					sessions
						.filter((session) => session.parentSessionId === null)
						.map((session) => <SessionDiagnostic api={api} session={session} currentSessionId={agent.currentSessionId} key={session.id} />)
				}
			</Live>
		</div>
	</details>
);
