import { useCommand } from "@antumbra/glass-client/hooks.ts";
import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { Values } from "@antumbra/platform-feature/fields.ts";
import type { Send } from "@antumbra/platform-rpc/client.ts";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { ReactNode } from "react";
import { messageOf } from "#refusal.ts";
import { Button } from "#shadcn/button.tsx";

export const ActButton = <Command extends CommandShape, Failure>(props: {
	readonly command: Send<Command, Failure>;
	readonly input: Values<Command["input"]>;
	readonly label: string;
}): ReactNode => {
	const { pending, result, run } = useCommand(props.command);
	const refused = AsyncResult.isFailure(result) && !result.waiting ? messageOf(result.cause) : null;
	return (
		<span className="flex min-w-0 items-center gap-2">
			<Button disabled={pending} onClick={() => run(props.input)} size="sm" type="button" variant="ghost">
				{props.label}
			</Button>
			{refused === null ? null : (
				<p className="text-xs text-destructive" role="alert">
					{refused}
				</p>
			)}
		</span>
	);
};
