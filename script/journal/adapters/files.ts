import { lstatSync } from "node:fs";
import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";

const toError = (cause: unknown): Error => (cause instanceof Error ? cause : new Error(String(cause)));

const there = (path: string): boolean => lstatSync(path, { throwIfNoEntry: false }) !== undefined;

export const appDataDirectory = (): string => join(homedir(), "Library", "Application Support");

export const present = (path: string): Effect.Effect<boolean> => Effect.sync(() => there(path));

export const removePresent = (paths: readonly string[]): Effect.Effect<readonly string[], Error> =>
	Effect.tryPromise({
		catch: toError,
		try: async () => {
			const removed: string[] = [];
			for (const path of paths) {
				if (!there(path)) continue;
				await rm(path);
				removed.push(path);
			}
			return removed;
		},
	});
