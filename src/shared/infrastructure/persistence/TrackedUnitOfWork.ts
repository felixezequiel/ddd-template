import type { AggregateRoot } from "../../domain/aggregates/AggregateRoot.ts";
import type { Identifier } from "../../domain/identifiers/Identifier.ts";
import type { UnitOfWork } from "../../application/UnitOfWork.ts";
import { AggregateTracker } from "./AggregateTracker.ts";

export abstract class TrackedUnitOfWork implements UnitOfWork {
  public async begin(): Promise<void> {
    AggregateTracker.begin();
    await this.onBegin();
  }

  public async commit(): Promise<void> {
    const trackedAggregates = AggregateTracker.drain();
    await this.onCommit(trackedAggregates);
  }

  public async rollback(): Promise<void> {
    AggregateTracker.clear();
    await this.onRollback();
  }

  public getTrackedAggregates(): ReadonlyArray<AggregateRoot<Identifier, object>> {
    return AggregateTracker.peek();
  }

  protected abstract onBegin(): Promise<void>;

  protected abstract onCommit(
    trackedAggregates: ReadonlyArray<AggregateRoot<Identifier, object>>,
  ): Promise<void>;

  protected abstract onRollback(): Promise<void>;
}
