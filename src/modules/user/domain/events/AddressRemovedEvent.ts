import type { DomainEvent } from "../../../../shared/domain/events/DomainEvent.ts";

export class AddressRemovedEvent implements DomainEvent {
  public readonly eventName = "AddressRemoved";
  public readonly occurredAt: Date;
  public readonly aggregateId: string;
  public readonly addressId: string;

  constructor(aggregateId: string, addressId: string) {
    this.aggregateId = aggregateId;
    this.addressId = addressId;
    this.occurredAt = new Date();
  }
}
