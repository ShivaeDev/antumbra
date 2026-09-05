import { Layer } from "effect";
import { ResourceReconciler } from "#resource-reconciler.ts";
import { defaultResourceReconcileOptions, type ResourceReconcileOptions, ResourceReconcilerOptions } from "#resource-reconciler-options.ts";

export const ResourceReconcilerLive = (overrides: Partial<ResourceReconcileOptions> = {}) =>
	ResourceReconciler.layer.pipe(Layer.provide(Layer.succeed(ResourceReconcilerOptions)({ ...defaultResourceReconcileOptions, ...overrides })));
