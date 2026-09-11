import { resolveChurchOperator } from "@/lib/churchOperator";
import { describe, expect, it } from "vitest";

describe("church operator resolution", () => {
  it("identifies the operator church from membership", () => {
    const operator = resolveChurchOperator({
      userId: "user-1",
      email: "op@example.com",
      membership: {
        church_id: "church-1",
        role: "operator",
        churches: { id: "church-1", name: "Example Church" },
      },
    });

    expect(operator).toEqual({
      userId: "user-1",
      email: "op@example.com",
      churchId: "church-1",
      churchName: "Example Church",
      role: "operator",
    });
  });

  it("rejects a signed-in user with no church membership", () => {
    expect(
      resolveChurchOperator({
        userId: "user-1",
        email: "guest@example.com",
        membership: null,
      })
    ).toBeNull();
  });

  it("rejects an unknown role", () => {
    expect(
      resolveChurchOperator({
        userId: "user-1",
        membership: {
          church_id: "church-1",
          role: "listener",
          churches: { id: "church-1", name: "Example Church" },
        },
      })
    ).toBeNull();
  });
});
