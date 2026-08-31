import type { AgentSummary } from "@antumbra/contract";
import { AgentDiagChips, SessionDiagChips } from "#views/diagnostics.tsx";

export const DiagnosticsDisclosure = ({ agent }: { readonly agent: AgentSummary }) => (
	<details className="min-w-0 border-t border-border pt-1.5">
		<summary className="cursor-pointer text-2xs text-muted-foreground hover:text-foreground">diagnostics</summary>
		<div className="flex min-w-0 flex-col gap-1 pt-1.5">
			<div className="flex min-w-0 flex-wrap items-center gap-1">
				<AgentDiagChips diag={agent.diag} />
			</div>
			{agent.sessions.map((session) => (
				<div className="flex min-w-0 flex-wrap items-center gap-1" key={session.id}>
					<span className="font-mono text-2xs text-muted-foreground">{session.id.slice(0, 8)}</span>
					<SessionDiagChips diag={session.diag} />
				</div>
			))}
		</div>
	</details>
);
