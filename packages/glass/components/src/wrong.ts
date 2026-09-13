import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";
import { useMemo } from "react";
import type { Editable } from "#fields.ts";
import type { Generated } from "#generated.ts";
import { messageOf } from "#refusal.ts";

export const useWrong = <Sent, Failure>(
	form: Generated,
	editables: readonly Editable[],
	sent: AsyncResult.AsyncResult<Sent, Failure>,
): string | null => {
	const errors = useMemo(
		() =>
			Atom.readable((get): string | undefined => {
				for (const editable of editables) {
					const message = get(form.error(editable.name));
					if (message !== undefined) {
						return message;
					}
				}
				return undefined;
			}),
		[editables, form],
	);
	const wrong = useAtomValue(errors);
	const refused = AsyncResult.isFailure(sent) && !sent.waiting ? messageOf(sent.cause) : null;
	return wrong ?? refused;
};
