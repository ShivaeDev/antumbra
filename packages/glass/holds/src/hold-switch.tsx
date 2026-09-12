import type { FlagKey } from "@antumbra/domain-settings/ids.ts";
import { useCommand } from "@antumbra/glass-client/hooks.ts";
import { Cause } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useId } from "react";
import type { HoldsApi } from "#glass.ts";
export const HoldSwitch = ({
	api,
	setting,
	title,
	held,
	everything,
}: {
	readonly api: HoldsApi;
	readonly setting: FlagKey;
	readonly title: string;
	readonly held: boolean;
	readonly everything: boolean;
}) => {
	const command = useCommand(api.settings.setFlag);
	const id = useId();
	const releasedWord = everything ? "everything held" : "sending";
	const word = held ? "held" : releasedWord;
	return (
		<span className="flex items-center gap-2">
			<label htmlFor={id}>{word}</label>
			<input
				id={id}
				aria-label={title}
				type="checkbox"
				checked={!held}
				disabled={command.pending}
				onChange={(event) => command.run({ key: setting, on: !event.target.checked })}
			/>
			{AsyncResult.isFailure(command.result) ? <span role="alert">{Cause.pretty(command.result.cause)}</span> : null}
		</span>
	);
};
