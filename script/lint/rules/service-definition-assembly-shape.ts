import ts from "typescript";
import {
	invalidServiceMembers,
	isEffectVoid,
	isOperationReference,
	returnedServiceMethods,
	serviceProperty,
	unwrapExpression,
} from "#lint/rules/service-definition-assembly-syntax.ts";

export interface ServiceAssemblyProblem {
	readonly message: string;
	readonly node: ts.Node;
}

export const serviceDefinitionProblems = (
	definition: ts.CallExpression,
	effects: ReadonlySet<string>,
	imports: ReadonlySet<string>,
	allowedBodies: Set<ts.Node>,
): readonly ServiceAssemblyProblem[] => {
	const config = definition.arguments[0];
	if (config === undefined || !ts.isObjectLiteralExpression(config)) {
		return [{ message: "Inline the service inventory.", node: definition }];
	}
	const found: ServiceAssemblyProblem[] = invalidServiceMembers(config).map(
		(node) => ({
			message:
				"List id, initialize, methods, and requires directly; computed members and spreads cannot hide the service inventory.",
			node,
		}),
	);
	const initialize = serviceProperty(config, "initialize")?.initializer;
	if (
		initialize !== undefined &&
		(!ts.isIdentifier(unwrapExpression(initialize)) ||
			!imports.has(unwrapExpression(initialize).getText())) &&
		!isEffectVoid(unwrapExpression(initialize), effects)
	) {
		found.push({
			message: "Reference a named initializer export or use Effect.void.",
			node: initialize,
		});
	}
	const methodsValue = serviceProperty(config, "methods")?.initializer;
	const methods = methodsValue && returnedServiceMethods(methodsValue);
	if (methodsValue !== undefined && methods === undefined) {
		found.push({
			message: "Keep methods as a direct operation inventory.",
			node: methodsValue,
		});
		return found;
	}
	if (methodsValue !== undefined) allowedBodies.add(methodsValue);
	for (const operation of methods?.properties ?? []) {
		if (!isOperationReference(operation, imports)) {
			found.push({
				message:
					"Reference a named operation export or call its named state factory.",
				node: operation,
			});
		}
	}
	return found;
};
