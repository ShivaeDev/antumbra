import { resolve } from "node:path";
import { definition } from "@antumbra/server/application.ts";
import { checkPostgresFixture } from "@antumbra/server-journal/postgres/fixture.ts";
import { validateFixture } from "@antumbra/server-journal/testing/validate-fixture.ts";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Cause, Config, Console, Effect, Result } from "effect";
import { captureFixture, extractFixture, listFixtures } from "#fixture/adapters/archive.ts";
import { workingManifest } from "#fixture/adapters/launch.ts";
import { stopViewer, withCheckOwnership, withViewerOwnership } from "#fixture/adapters/viewer-owner.ts";
import { checkViewer, startViewer } from "#fixture/adapters/viewer-process.ts";
import { parseCommand, type Target, usage } from "#fixture/command.ts";
import type { Manifest } from "#fixture/manifest.ts";
import { fixturePaths, sourceDirectory } from "#fixture/paths.ts";
import { appDataDirectory } from "#journal/adapters/files.ts";
import { overrideVariable } from "#journal/paths.ts";

const checkout = resolve(import.meta.dirname, "..");
const paths = fixturePaths(checkout);

const check = Effect.fn("Fixture.check")(function* (selector: string, target: Target) {
	yield* Console.log(`Checking fixture ${selector} against ${target}…`);
	const fixture = yield* withCheckOwnership(
		checkout,
		Effect.gen(function* () {
			const extracted = yield* extractFixture({ archiveRoot: paths.archiveRoot, selector, destination: paths.check });
			yield* checkViewer(checkout);
			yield* validateFixture(resolve(paths.check, "server", "journal.db"), definition);
			if (target === "postgres") {
				const postgres = yield* checkPostgresFixture(resolve(paths.check, "server", "journal.db"));
				yield* Console.log(JSON.stringify({ postgres }));
			}
			return extracted;
		}),
	);
	yield* Console.log(
		`Fixture ${fixture.id}: journal startup and reads passed${target === "postgres" ? "; isolated PostgreSQL domain histories and rows match" : ""}.`,
	);
});

const program = Effect.gen(function* () {
	const parsed = parseCommand(process.argv.slice(2));
	if (Result.isFailure(parsed)) return yield* Effect.fail(new Error(parsed.failure));
	const command = parsed.success;
	if (command.name === "help") return yield* Console.log(usage);
	if (command.name === "list") {
		const fixtures = yield* listFixtures(paths.archiveRoot);
		if (fixtures.length === 0) return yield* Console.log("No fixtures captured. Use fixture capture <label>.");
		return yield* Effect.forEach(fixtures, (fixture) => Console.log(`${fixture.id}\t${fixture.label}\t${fixture.captureCompletedAt}`));
	}
	if (command.name === "capture") {
		const override = yield* Config.String(overrideVariable).pipe(Config.withDefault(""));
		const directory = yield* sourceDirectory(command.source, appDataDirectory(), override);
		yield* Console.log(`Capturing ${command.source} as ${command.label}…`);
		const fixture = yield* captureFixture({
			sourceDirectory: directory,
			archiveRoot: paths.archiveRoot,
			label: command.label,
			source: command.source,
		});
		yield* Console.log(`Captured fixture ${fixture.id}: ${fixture.label}`);
		if (command.target === "postgres") yield* check(String(fixture.id), command.target);
		return;
	}
	if (command.name === "stop") {
		yield* withViewerOwnership(checkout, stopViewer(checkout));
		return yield* Console.log("Fixture viewer stopped; working copy preserved.");
	}
	if (command.name === "check") {
		return yield* check(command.selector, command.target);
	}
	const { fixture, viewer } = yield* withViewerOwnership(
		checkout,
		Effect.gen(function* () {
			let fixture: Manifest;
			if (command.name === "open") {
				yield* stopViewer(checkout);
				fixture = yield* extractFixture({ archiveRoot: paths.archiveRoot, selector: command.selector, destination: paths.open });
			} else {
				fixture = yield* workingManifest(paths.open);
			}
			const viewer = yield* startViewer(checkout, fixture);
			return { fixture, viewer };
		}),
	);
	yield* Console.log(`Fixture ${fixture.id}: ${viewer.url}`);
}).pipe(
	Effect.catchCause((cause) =>
		Console.error(Cause.pretty(cause)).pipe(
			Effect.tap(() =>
				Effect.sync(() => {
					process.exitCode = 1;
				}),
			),
		),
	),
);

NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)), { disableErrorReporting: true });
