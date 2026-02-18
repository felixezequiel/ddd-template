import type { DomainEvent } from "../../../../shared/domain/events/DomainEvent.ts";

export class UserCreatedEvent implements DomainEvent {
  public readonly eventName = "UserCreated";
  public readonly occurredAt: Date;
  public readonly aggregateId: string;
  public readonly email: string;

  constructor(aggregateId: string, email: string) {
    this.aggregateId = aggregateId;
    this.email = email;
    this.occurredAt = new Date();
  }
}
