import type { Effect, Scope } from "effect";
import type { ApplicationServices } from "#application-story.ts";
import { type App, applicationStory } from "#application-story.ts";

export type { App } from "#application-story.ts";

type Services = ApplicationServices;

export const it = {
	app: <Done>(name: string, body: (app: App) => Generator<Effect.Effect<unknown, unknown, Services | Scope.Scope>, Done, never>): void =>
		applicationStory.it(name, [], body),
};

export { answered, eventually } from "#answers.ts";

export { definition } from "#app.ts";
