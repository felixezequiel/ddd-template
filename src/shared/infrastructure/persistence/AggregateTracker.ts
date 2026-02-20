import { AsyncLocalStorage } from "node:async_hooks";
import type { AggregateRoot } from "../../domain/aggregates/AggregateRoot.ts";
import type { Identifier } from "../../domain/identifiers/Identifier.ts";

type TrackedSet = Set<AggregateRoot<Identifier, object>>;
type TrackedStack = Array<TrackedSet>;

const asyncLocalStorage = new AsyncLocalStorage<TrackedStack>();

export class AggregateTracker {
  public static run<T>(callback: () => Promise<T>): Promise<T> {
    return asyncLocalStorage.run([], callback);
  }

  public static begin(): void {
    let stack = asyncLocalStorage.getStore();
    if (stack === undefined) {
      stack = [];
      asyncLocalStorage.enterWith(stack);
    }
    stack.push(new Set());
  }

  public static track(aggregate: AggregateRoot<Identifier, object>): void {
    const stack = asyncLocalStorage.getStore();
    if (stack === undefined || stack.length === 0) {
      return;
    }
    const currentScope = stack[stack.length - 1]!;
    currentScope.add(aggregate);
  }

  public static drain(): Array<AggregateRoot<Identifier, object>> {
    const stack = asyncLocalStorage.getStore();
    if (stack === undefined || stack.length === 0) {
      return [];
    }
    const currentScope = stack.pop()!;
    return Array.from(currentScope);
  }

  public static peek(): Array<AggregateRoot<Identifier, object>> {
    const stack = asyncLocalStorage.getStore();
    if (stack === undefined || stack.length === 0) {
      return [];
    }
    const currentScope = stack[stack.length - 1]!;
    return Array.from(currentScope);
  }

  public static clear(): void {
    const stack = asyncLocalStorage.getStore();
    if (stack === undefined || stack.length === 0) {
      return;
    }
    stack.pop();
  }
}
