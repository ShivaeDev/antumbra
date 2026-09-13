import type { IncomingMessage } from "node:http";
import { DraftRef } from "@antumbra/platform-shell/bridge.ts";
import { Effect, ManagedRuntime, Schema } from "effect";
import { ShellDrafts, ShellDraftsLayer } from "#adapters/drafts.ts";

const Write = Schema.Struct({ ...DraftRef.fields, text: Schema.String });
const Clear = Schema.Struct({ ...DraftRef.fields, revision: Schema.String });

export const fixtureDrafts = (directory: string) => {
	const drafts = ManagedRuntime.make(ShellDraftsLayer(directory));
	return {
		dispose: () => drafts.dispose(),
		request: async (request: IncomingMessage) => {
			request.setEncoding("utf8");
			let body = "";
			for await (const chunk of request) body += Schema.decodeUnknownSync(Schema.String)(chunk);
			const raw: unknown = JSON.parse(body);
			const operation = request.url;
			return drafts.runPromise(
				Effect.gen(function* () {
					const store = yield* ShellDrafts;
					if (operation === "/__fixture/draft/read") return yield* store.read(Schema.decodeUnknownSync(DraftRef)(raw));
					if (operation === "/__fixture/draft/write") {
						const value = Schema.decodeUnknownSync(Write)(raw);
						return yield* store.write(value, value.text);
					}
					const value = Schema.decodeUnknownSync(Clear)(raw);
					yield* store.clear(value, value.revision);
					return null;
				}),
			);
		},
	};
};
