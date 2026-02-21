export class SystemEventEntity {
  public id!: string;
  public eventName!: string;
  public aggregateId!: string;
  public occurredAt!: string;
  public payload!: string;
  public causationId!: string | null;
}
