import { useLive } from "@antumbra/glass-client/hooks.ts";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ErrorsApi } from "#glass.ts";

export const LoopToasts = ({ api, onOpen }: { readonly api: ErrorsApi; readonly onOpen: () => void }) => {
	const answer = useLive(api.supervision.stoppedLoops, {});
	const announced = useRef<Map<string, number>>(undefined);
	useEffect(() => {
		if (!AsyncResult.isSuccess(answer)) return;
		const stopped = answer.value.filter((entry) => entry.state === "stopped");
		const known = announced.current;
		announced.current = new Map(stopped.map((entry) => [entry.loop, entry.at]));
		if (known === undefined) return;
		for (const entry of stopped) {
			if (known.get(entry.loop) === entry.at) continue;
			toast.error(`The ${entry.loop} loop stopped on an error.`, {
				action: { label: "Errors", onClick: onOpen },
				duration: Number.POSITIVE_INFINITY,
			});
		}
	}, [answer, onOpen]);
	return null;
};
