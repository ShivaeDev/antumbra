import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { useCommand } from "@antumbra/glass-client/hooks.ts";
import { messageOf } from "@antumbra/glass-components/refusal.ts";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Clock, Effect } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { SessionsApi } from "#glass.ts";

type Look = "ghost" | "outline";

const requestedAt = (): string => new Date(Effect.runSync(Clock.currentTimeMillis)).toISOString();

const Act = (props: {
	readonly disabled: boolean;
	readonly label: string;
	readonly look: Look;
	readonly onAct: () => void;
	readonly refusal: string | null;
}) => (
	<span className="flex min-w-0 items-center gap-2">
		<Button disabled={props.disabled} size="sm" variant={props.look} onClick={props.onAct}>
			{props.label}
		</Button>
		{props.refusal === null ? null : (
			<p className="min-w-0 truncate text-xs text-destructive" role="alert">
				{props.refusal}
			</p>
		)}
	</span>
);

const Stop = (props: { readonly api: SessionsApi; readonly sessionId: string; readonly look: Look }) => {
	const action = useCommand(props.api.sessions.stop);
	return (
		<Act
			disabled={action.pending}
			label="Stop"
			look={props.look}
			refusal={AsyncResult.isFailure(action.result) ? messageOf(action.result.cause) : null}
			onAct={() => action.run({ sessionId: SessionId.make(props.sessionId), reason: "admiral", requestedAt: requestedAt() })}
		/>
	);
};

const Sleep = (props: { readonly api: SessionsApi; readonly sessionId: string; readonly look: Look }) => {
	const action = useCommand(props.api.sessions.request);
	return (
		<Act
			disabled={action.pending}
			label="Sleep"
			look={props.look}
			refusal={AsyncResult.isFailure(action.result) ? messageOf(action.result.cause) : null}
			onAct={() =>
				action.run({
					sessionId: SessionId.make(props.sessionId),
					kind: "sleep",
					inputId: null,
					reason: "admiral",
					requestedAt: requestedAt(),
				})
			}
		/>
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
			{props.canInterrupt ? <Stop api={props.api} sessionId={props.sessionId} look={look} /> : null}
			{props.canSleep ? <Sleep api={props.api} sessionId={props.sessionId} look={look} /> : null}
		</>
	);
};
