import type { AggregateRoot } from "../domain/aggregates/AggregateRoot.ts";
import type { Identifier } from "../domain/identifiers/Identifier.ts";

export interface UseCaseResult<Result> {
  readonly result: Result;
  readonly aggregates: ReadonlyArray<AggregateRoot<Identifier, object>>;
}

export interface UseCase<Command, Result> {
  execute(command: Command): Promise<UseCaseResult<Result>>;
}
