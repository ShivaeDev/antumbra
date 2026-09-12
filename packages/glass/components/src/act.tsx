import { useCommand } from "@antumbra/glass-client/hooks.ts";
import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { Values } from "@antumbra/platform-feature/fields.ts";
import type { Send } from "@antumbra/platform-rpc/client.ts";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { ReactNode } from "react";
import { ACT, ALERT, ROW } from "#classes.ts";
import { messageOf } from "#refusal.ts";

export const CommandAct = <Command extends CommandShape, Failure>(props: {
	readonly command: Send<Command, Failure>;
	readonly input: Values<Command["input"]>;
	readonly label: string;
}): ReactNode => {
	const { pending, result, run } = useCommand(props.command);
	const refused = AsyncResult.isFailure(result) && !result.waiting ? messageOf(result.cause) : null;
	return (
		<span className={ROW}>
			<button className={ACT} disabled={pending} onClick={() => run(props.input)} type="button">
				{props.label}
			</button>
			{refused === null ? null : (
				<p className={ALERT} role="alert">
					{refused}
				</p>
			)}
		</span>
	);
};
