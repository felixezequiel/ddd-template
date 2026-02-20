import { Entity } from "../entities/Entity.ts";
import type { Identifier } from "../identifiers/Identifier.ts";
import type { DomainEvent } from "../events/DomainEvent.ts";

type OnTrackCallback = (aggregate: AggregateRoot<Identifier, object>) => void;

export abstract class AggregateRoot<
  Id extends Identifier,
  Props extends object,
> extends Entity<Id, Props> {
  private static onTrackCallback: OnTrackCallback | null = null;

  private domainEvents: Array<DomainEvent> = [];
  private tracked = false;

  public static setOnTrack(callback: OnTrackCallback | null): void {
    AggregateRoot.onTrackCallback = callback;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);

    if (!this.tracked && AggregateRoot.onTrackCallback !== null) {
      this.tracked = true;
      AggregateRoot.onTrackCallback(this);
    }
  }

  public getDomainEvents(): ReadonlyArray<DomainEvent> {
    return [...this.domainEvents];
  }

  public drainDomainEvents(): ReadonlyArray<DomainEvent> {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    this.tracked = false;
    return events;
  }
}
