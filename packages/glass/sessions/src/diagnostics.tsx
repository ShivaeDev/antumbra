import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { CommandAct } from "@antumbra/glass-components/act.tsx";
import { Badge } from "@antumbra/glass-components/ui/badge.tsx";
import type { SessionsApi } from "#glass.ts";

export const Diagnostics = ({
	api,
	agent,
}: {
	readonly api: Pick<SessionsApi, "starts" | "sessions">;
	readonly agent: typeof agentReading.Row.Type;
}) => (
	<details className="min-w-0 border-t border-border pt-1.5">
		<summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">diagnostics</summary>
		<div className="flex min-w-0 flex-col gap-1 pt-1.5">
			<Badge className="font-mono" variant="outline">
				current {agent.currentSessionId?.slice(0, 8) ?? "none"}
			</Badge>
			{agent.currentSessionId === null ? null : (
				<Live query={api.starts.bySession} input={{ sessionId: SessionId.make(agent.currentSessionId) }}>
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
			)}
			<Live query={api.sessions.forAgent} input={{ agentId: agent.id }}>
				{(sessions) =>
					sessions
						.filter((session) => session.parentSessionId === null)
						.map((session) => (
							<div key={session.id} className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
								<span className="font-mono text-muted-foreground">{session.id.slice(0, 8)}</span>
								<Badge className="font-mono" variant="outline">
									{session.executionStatus}
									{session.id === agent.currentSessionId ? " · current" : ""}
								</Badge>
								<Live query={api.sessions.operations} input={{ sessionId: session.id }}>
									{(operations) =>
										operations
											.filter((operation) => operation.status !== "accepted" && operation.status !== "cancelled")
											.map((operation) => (
												<span key={operation.id} className="flex items-center gap-1">
													<Badge className="font-mono" variant="outline">
														{operation.kind} · {operation.status}
													</Badge>
													{operation.detail === null ? null : <span>{operation.detail}</span>}
													{operation.status === "waiting" ? (
														<CommandAct command={api.sessions.retry} input={{ id: operation.id }} label="Retry" />
													) : null}
												</span>
											))
									}
								</Live>
							</div>
						))
				}
			</Live>
		</div>
	</details>
);
