import { Entity } from "../entities/Entity.ts";
import type { Identifier } from "../identifiers/Identifier.ts";
import type { DomainEvent } from "../events/DomainEvent.ts";

export abstract class AggregateRoot<
  Id extends Identifier,
  Props extends object,
> extends Entity<Id, Props> {
  private domainEvents: Array<DomainEvent> = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  public getDomainEvents(): ReadonlyArray<DomainEvent> {
    return [...this.domainEvents];
  }

  public drainDomainEvents(): ReadonlyArray<DomainEvent> {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
