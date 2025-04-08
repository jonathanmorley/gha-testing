import { it } from "vitest";
import { hello } from "../../src/index.js";

it("should return hello world", ({ expect }) => {
  const result = hello("World");
  expect(result).toBe("Hello World!");
});

for(let i = 0; i < 100; i++) {
  it("should return hello world" + i, ({ expect }) => {
    const result = hello("World");
    expect(result).toBe("Hello World!");
  });
}