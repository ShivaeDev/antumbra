import { ChangeHostRefused } from "@antumbra/platform-change-host/port.ts";
import { Changes } from "@antumbra/server-changes/service.ts";
import { Effect } from "effect";
export const readWorld = Changes.use((service) => service.world({})).pipe(Effect.orDie);
export const namedRepo = Effect.fn("changes.namedRepo")(function* (name: string) {
	const snapshot = yield* readWorld;
	const repo = snapshot.repos.find((repo) => repo.name === name);
	return repo === undefined ? yield* new ChangeHostRefused({ host: "unknown", detail: `Unknown repository ${name}` }) : repo;
});
export const readChange = Effect.fn("changes.readChange")(function* (id: string) {
	const snapshot = yield* readWorld;
	const row = snapshot.changes.find((row) => row.id === id);
	return row === undefined ? yield* new ChangeHostRefused({ host: "unknown", detail: `Unknown change ${id}` }) : row;
});
