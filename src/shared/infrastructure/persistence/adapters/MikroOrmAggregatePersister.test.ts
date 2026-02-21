import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MikroOrmAggregatePersister } from "./MikroOrmAggregatePersister.ts";
import { AggregateRoot } from "../../../domain/aggregates/AggregateRoot.ts";
import { Identifier } from "../../../domain/identifiers/Identifier.ts";
import type { EntityManager } from "@mikro-orm/core";

// --- Test doubles ---

class TestAggregateId extends Identifier {}

class TestAggregate extends AggregateRoot<TestAggregateId, { readonly value: string }> {
  public get value(): string {
    return this.props.value;
  }

  public static create(id: TestAggregateId, value: string): TestAggregate {
    return new TestAggregate(id, { value });
  }
}

class OtherAggregate extends AggregateRoot<Identifier, { readonly data: string }> {}

class TestOrmEntity {
  public id!: string;
  public value!: string;
}

class TestNestedOrmEntity {
  public id!: string;
  public parentId!: string;
}

interface UpsertCall {
  readonly entityClass: unknown;
  readonly data: unknown;
}

function createFakeEntityManager(): { entityManager: EntityManager; upsertCalls: Array<UpsertCall> } {
  const upsertCalls: Array<UpsertCall> = [];

  const entityManager = {
    upsert(entityClassOrData: unknown, data?: unknown): void {
      if (data !== undefined) {
        upsertCalls.push({ entityClass: entityClassOrData, data });
      } else {
        upsertCalls.push({ entityClass: null, data: entityClassOrData });
      }
    },
  } as unknown as EntityManager;

  return { entityManager, upsertCalls };
}

function createTestMapper(aggregate: TestAggregate): TestOrmEntity {
  const entity = new TestOrmEntity();
  entity.id = aggregate.id.value;
  entity.value = aggregate.value;
  return entity;
}

// --- Tests ---

describe("MikroOrmAggregatePersister", () => {
  it("should support aggregates of the configured class", () => {
    const persister = new MikroOrmAggregatePersister({
      aggregateClass: TestAggregate,
      ormEntityClass: TestOrmEntity,
      toOrmEntity: createTestMapper,
    });

    const aggregate = TestAggregate.create(new TestAggregateId("test-1"), "hello");

    assert.ok(persister.supports(aggregate));
  });

  it("should not support aggregates of a different class", () => {
    const persister = new MikroOrmAggregatePersister({
      aggregateClass: TestAggregate,
      ormEntityClass: TestOrmEntity,
      toOrmEntity: createTestMapper,
    });

    const otherAggregate = new OtherAggregate(new Identifier("other-1"), { data: "other" });

    assert.ok(!persister.supports(otherAggregate));
  });

  it("should persist only the root entity when no nested entities are configured", () => {
    const fakeEntityManager = createFakeEntityManager();

    const persister = new MikroOrmAggregatePersister({
      aggregateClass: TestAggregate,
      ormEntityClass: TestOrmEntity,
      toOrmEntity: createTestMapper,
    });

    const aggregate = TestAggregate.create(new TestAggregateId("test-1"), "hello");
    persister.persist(aggregate, fakeEntityManager.entityManager);

    const EXPECTED_UPSERT_COUNT = 1;
    assert.equal(fakeEntityManager.upsertCalls.length, EXPECTED_UPSERT_COUNT);

    const rootUpsertCall = fakeEntityManager.upsertCalls[0]!;
    assert.equal(rootUpsertCall.entityClass, TestOrmEntity);

    const persistedEntity = rootUpsertCall.data as TestOrmEntity;
    assert.equal(persistedEntity.id, "test-1");
    assert.equal(persistedEntity.value, "hello");
  });

  it("should persist root entity and nested entities when getNestedEntities is provided", () => {
    const fakeEntityManager = createFakeEntityManager();

    const nestedEntity1 = new TestNestedOrmEntity();
    nestedEntity1.id = "nested-1";
    nestedEntity1.parentId = "test-1";

    const nestedEntity2 = new TestNestedOrmEntity();
    nestedEntity2.id = "nested-2";
    nestedEntity2.parentId = "test-1";

    const persister = new MikroOrmAggregatePersister({
      aggregateClass: TestAggregate,
      ormEntityClass: TestOrmEntity,
      toOrmEntity: createTestMapper,
      getNestedEntities: function extractNestedEntities(): Array<object> {
        return [nestedEntity1, nestedEntity2];
      },
    });

    const aggregate = TestAggregate.create(new TestAggregateId("test-1"), "hello");
    persister.persist(aggregate, fakeEntityManager.entityManager);

    const ROOT_UPSERT_COUNT = 1;
    const NESTED_UPSERT_COUNT = 2;
    const EXPECTED_TOTAL_UPSERTS = ROOT_UPSERT_COUNT + NESTED_UPSERT_COUNT;
    assert.equal(fakeEntityManager.upsertCalls.length, EXPECTED_TOTAL_UPSERTS);

    const rootUpsertCall = fakeEntityManager.upsertCalls[0]!;
    assert.equal(rootUpsertCall.entityClass, TestOrmEntity);

    const firstNestedUpsertCall = fakeEntityManager.upsertCalls[1]!;
    assert.equal(firstNestedUpsertCall.entityClass, null);
    assert.equal(firstNestedUpsertCall.data, nestedEntity1);

    const secondNestedUpsertCall = fakeEntityManager.upsertCalls[2]!;
    assert.equal(secondNestedUpsertCall.entityClass, null);
    assert.equal(secondNestedUpsertCall.data, nestedEntity2);
  });
});