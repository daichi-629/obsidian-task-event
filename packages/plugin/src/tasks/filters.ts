import type { TaskChange } from "./diff";
import type { TaskChangeContext, TaskChangeHandler } from "./pipeline";

export type TaskChangePredicate = (
	change: TaskChange,
	context: TaskChangeContext
) => boolean;

export function withFilter(
	handler: TaskChangeHandler,
	predicate: TaskChangePredicate
): TaskChangeHandler {
	return async (changes, context) => {
		const filtered = changes.filter((change) => predicate(change, context));
		if (filtered.length === 0) {
			return;
		}

		await handler(filtered, context);
	};
}
