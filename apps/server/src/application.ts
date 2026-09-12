import { app } from "@antumbra/server-journal/app.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { serving } from "@antumbra/server-journal/rpc.ts";
import { Layer } from "effect";
import { features } from "#features.ts";

export const definition = app(features);

export const application = Layer.provideMerge(serving(definition.features), Journal.layer(definition));
