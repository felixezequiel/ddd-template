import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SendWelcomeEmailCommand } from "./SendWelcomeEmailCommand.ts";

describe("SendWelcomeEmailCommand", () => {
  it("should create a command from primitives using the of() factory", () => {
    const command = SendWelcomeEmailCommand.of("user-123", "john@example.com");

    assert.equal(command.userId.value, "user-123");
    assert.equal(command.email.props.value, "john@example.com");
  });

  it("should reject an invalid email format", () => {
    assert.throws(
      () => SendWelcomeEmailCommand.of("user-123", "invalid-email"),
    );
  });
});