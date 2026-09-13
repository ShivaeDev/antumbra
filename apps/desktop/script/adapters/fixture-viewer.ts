import { Effect, Schema } from "effect";
import { checkFixtureServer } from "#script/adapters/fixture/build.ts";
import { fixtureRenderer } from "#script/adapters/fixture/renderer.ts";
import { watchFixtureServer } from "#script/adapters/fixture/server.ts";

const Arguments = Schema.Tuple([Schema.String, Schema.String, Schema.String]);

const serve = async () => {
	if (process.argv[2] === "--check") {
		await checkFixtureServer(Schema.decodeUnknownSync(Schema.String)(process.argv[3]));
		return;
	}
	const [directory, label, captureCompletedAt] = Schema.decodeUnknownSync(Arguments)(process.argv.slice(2));
	const token = crypto.randomUUID();
	const server = await watchFixtureServer(directory, token);
	const renderer = await fixtureRenderer(directory, label, captureCompletedAt, token, server);
	process.once("SIGTERM", () => {
		void renderer.shutdown().then(renderer.close);
	});
	try {
		await server.ready;
		const url = await renderer.listen();
		process.send?.({ url, token });
		process.stdout.write(`Fixture viewer: ${url}\n`);
	} catch (error) {
		await renderer.shutdown();
		await renderer.close();
		throw error;
	}
};

export const fixtureViewer = Effect.promise(serve);
