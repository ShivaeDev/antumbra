import { useAtomValue } from "@effect/atom-react";
import { Cause, Option } from "effect";
import { AsyncResult, type Atom } from "effect/unstable/reactivity";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";

export const RequestForm = ({
	form,
	children,
}: {
	readonly form: {
		readonly AppForm: ComponentType<PropsWithChildren>;
		readonly Form: ComponentType<{ readonly children: ReactNode }>;
		readonly requestAtom: Atom.Atom<AsyncResult.AsyncResult<unknown, { readonly message: string }>>;
	};
	readonly children: ReactNode;
}) => (
	<form.AppForm>
		<form.Form>
			{children}
			<RequestError result={form.requestAtom} />
		</form.Form>
	</form.AppForm>
);

const RequestError = ({ result }: { readonly result: Atom.Atom<AsyncResult.AsyncResult<unknown, { readonly message: string }>> }) => {
	const state = useAtomValue(result);
	if (!AsyncResult.isFailure(state) || state.waiting) return null;
	const error = Cause.findErrorOption(state.cause);
	return (
		<p role="alert" className="text-2xs text-destructive">
			{Option.isSome(error) ? error.value.message : "The request could not be completed"}
		</p>
	);
};
