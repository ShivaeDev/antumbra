import { useSend } from "@antumbra/glass-client/hooks.ts";
import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { Values } from "@antumbra/platform-feature/fields.ts";
import type { Send } from "@antumbra/platform-rpc/client.ts";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import { type ReactNode, useState } from "react";
import { ACT, ALERT, ROW } from "#classes.ts";
import type { Held } from "#fields.ts";
import { sending } from "#generated.ts";
import { messageOf } from "#refusal.ts";

export const CommandAct = <Command extends CommandShape, Failure>(props: {
	readonly command: Send<Command, Failure>;
	readonly input: Values<Command["input"]>;
	readonly label: string;
}): ReactNode => {
	const send = sending(useSend(props.command));
	const [acting] = useState(() => Atom.fn<Held>()((input: Held) => send(input)));
	const result = useAtomValue(acting);
	const act = useAtomSet(acting);
	const refused = AsyncResult.isFailure(result) && !result.waiting ? messageOf(result.cause) : null;
	return (
		<span className={ROW}>
			<button className={ACT} disabled={result.waiting} onClick={() => act(props.input)} type="button">
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
