import type { AntumbraBridge, AppInfo, AppRouter } from "@antumbra/contract";
import { createTRPCClient, TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { Data, Effect } from "effect";

declare global {
	interface Window {
		readonly antumbra: AntumbraBridge;
	}
}

const toError = (cause: unknown): Error =>
	cause instanceof Error ? cause : new Error(String(cause));

const bridgeLink =
	(): TRPCLink<AppRouter> =>
	() =>
	({ op }) =>
		observable((observer) => {
			if (op.type === "subscription") {
				observer.error(
					TRPCClientError.from(
						new Error("subscriptions are not wired over the bridge yet"),
					),
				);
				return;
			}
			window.antumbra
				.trpc({ input: op.input, path: op.path, type: op.type })
				.then((response) => {
					if (response.ok) {
						observer.next({ result: { data: response.data, type: "data" } });
						observer.complete();
					} else {
						observer.error(
							TRPCClientError.from(
								new Error(`${response.error.code}: ${response.error.message}`),
							),
						);
					}
				})
				.catch((cause: unknown) => {
					observer.error(TRPCClientError.from(toError(cause)));
				});
		});

const client = createTRPCClient<AppRouter>({ links: [bridgeLink()] });

export class AppInfoLoadError extends Data.TaggedError("AppInfoLoadError")<{
	readonly message: string;
}> {}

export const loadAppInfo: Effect.Effect<AppInfo, AppInfoLoadError> =
	Effect.tryPromise({
		catch: (cause) => new AppInfoLoadError({ message: String(cause) }),
		try: () => client.appInfo.query(),
	});
