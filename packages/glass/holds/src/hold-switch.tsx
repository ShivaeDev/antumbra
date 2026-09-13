import type { FlagKey } from "@antumbra/domain-settings/ids.ts";
import { useCommand } from "@antumbra/glass-client/hooks.ts";
import { Cause } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useId } from "react";
import type { HoldsApi } from "#glass.ts";
export const HoldSwitch = ({
	api,
	title,
	sending,
	held,
	toggle,
}: {
	readonly api: HoldsApi;
	readonly title: string;
	readonly sending: boolean;
	readonly held: boolean;
	readonly toggle: (sending: boolean) => { readonly key: FlagKey; readonly on: boolean };
}) => {
	const command = useCommand(api.settings.setFlag);
	const id = useId();
	return (
		<span className="flex items-center gap-2">
			<label htmlFor={id}>{held ? "held" : "sending"}</label>
			<input
				id={id}
				aria-label={title}
				type="checkbox"
				checked={sending}
				disabled={command.pending}
				onChange={(event) => command.run(toggle(event.target.checked))}
			/>
			{AsyncResult.isFailure(command.result) ? <span role="alert">{Cause.pretty(command.result.cause)}</span> : null}
		</span>
	);
};
