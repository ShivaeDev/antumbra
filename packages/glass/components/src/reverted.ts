import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useEffect } from "react";
import type { Generated } from "#generated.ts";

export const useReverted = <Sent, Failure>(form: Generated, sent: AsyncResult.AsyncResult<Sent, Failure>): void => {
	useEffect(() => {
		if (AsyncResult.isFailure(sent) && !sent.waiting) {
			form.revert();
		}
	}, [form, sent]);
};
