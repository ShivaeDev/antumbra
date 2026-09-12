import { NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import { assets } from "#adapters/assets.ts";
import { backends } from "#backends.ts";
import { main } from "#main.ts";

main((options) => backends({ cwd: options.directory, ...assets(import.meta.dirname) }).pipe(Effect.provide(NodeServices.layer), Effect.orDie));
