import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { useCommand } from "@antumbra/glass-client/hooks.ts";
import { messageOf } from "@antumbra/glass-components/refusal.ts";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Clock, Effect } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { SessionsApi } from "#glass.ts";

type Look = "ghost" | "outline";

const Operation = (props: {
	readonly api: SessionsApi;
	readonly sessionId: string;
	readonly kind: "interrupt" | "sleep";
	readonly label: string;
	readonly look: Look;
}) => {
	const action = useCommand(props.api.sessions.request);
	return (
		<span className="flex min-w-0 items-center gap-2">
			<Button
				disabled={action.pending}
				size="sm"
				variant={props.look}
				onClick={() =>
					action.run({
						sessionId: SessionId.make(props.sessionId),
						kind: props.kind,
						inputId: null,
						reason: "admiral",
						requestedAt: new Date(Effect.runSync(Clock.currentTimeMillis)).toISOString(),
					})
				}
			>
				{props.label}
			</Button>
			{AsyncResult.isFailure(action.result) ? (
				<p className="min-w-0 truncate text-xs text-destructive" role="alert">
					{messageOf(action.result.cause)}
				</p>
			) : null}
		</span>
	);
};

export const SessionActs = (props: {
	readonly api: SessionsApi;
	readonly sessionId: string;
	readonly canInterrupt: boolean;
	readonly canSleep: boolean;
	readonly look?: Look | undefined;
}) => {
	const look = props.look ?? "outline";
	return (
		<>
			{props.canInterrupt ? <Operation api={props.api} sessionId={props.sessionId} kind="interrupt" label="Interrupt" look={look} /> : null}
			{props.canSleep ? <Operation api={props.api} sessionId={props.sessionId} kind="sleep" label="Sleep" look={look} /> : null}
		</>
	);
};
