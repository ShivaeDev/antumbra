import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import { net, protocol } from "electron";

protocol.registerSchemesAsPrivileged([{ scheme: "antumbra", privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

export const rendererProtocol = Effect.acquireRelease(
	Effect.sync(() =>
		protocol.handle("antumbra", (request) => {
			const pathname = new URL(request.url).pathname;
			return net.fetch(pathToFileURL(join(import.meta.dirname, "renderer", pathname === "/" ? "index.html" : pathname)).toString());
		}),
	),
	() => Effect.sync(() => protocol.unhandle("antumbra")),
);
