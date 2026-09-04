import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

/**
 * `safeNextPath` is the single choke point guarding FR-402/BR-002
 * (open-redirect prevention) for both `/auth/callback` (`?next=`) and any
 * future caller. Every case here mirrors phase-03's spec table verbatim.
 */
describe("safeNextPath", () => {
  it("accepts a plain internal path", () => {
    expect(safeNextPath("/todo", "/todo")).toBe("/todo");
  });

  it("accepts a path with a query string", () => {
    expect(safeNextPath("/todo?x=1", "/todo")).toBe("/todo?x=1");
  });

  it("falls back when raw is null", () => {
    expect(safeNextPath(null, "/todo")).toBe("/todo");
  });

  it("falls back when raw is empty", () => {
    expect(safeNextPath("", "/todo")).toBe("/todo");
  });

  it("rejects protocol-relative paths (//host)", () => {
    expect(safeNextPath("//evil.com", "/todo")).toBe("/todo");
  });

  it("rejects backslash-prefixed paths (/\\host)", () => {
    expect(safeNextPath("/\\evil.com", "/todo")).toBe("/todo");
  });

  it("rejects absolute URLs", () => {
    expect(safeNextPath("https://evil.com", "/todo")).toBe("/todo");
  });

  it("rejects non-http schemes", () => {
    expect(safeNextPath("javascript:alert(1)", "/todo")).toBe("/todo");
  });

  it("rejects a path missing the leading slash", () => {
    expect(safeNextPath("todo", "/todo")).toBe("/todo");
  });

  it("rejects a raw carriage return", () => {
    expect(safeNextPath("/todo\rSet-Cookie: x=y", "/todo")).toBe("/todo");
  });

  it("rejects a raw line feed", () => {
    expect(safeNextPath("/todo\nSet-Cookie: x=y", "/todo")).toBe("/todo");
  });

  it("rejects a raw CRLF header-injection payload", () => {
    expect(safeNextPath("/todo\r\nSet-Cookie: x=y", "/todo")).toBe("/todo");
  });

  it("rejects a raw NUL byte", () => {
    expect(safeNextPath("/todo\0", "/todo")).toBe("/todo");
  });

  it("rejects a percent-encoded CRLF (uppercase)", () => {
    expect(safeNextPath("/todo%0D%0ASet-Cookie:%20x=y", "/todo")).toBe(
      "/todo",
    );
  });

  it("rejects a percent-encoded CRLF (lowercase)", () => {
    expect(safeNextPath("/todo%0d%0aSet-Cookie:%20x=y", "/todo")).toBe(
      "/todo",
    );
  });

  it("rejects a percent-encoded NUL byte", () => {
    expect(safeNextPath("/todo%00", "/todo")).toBe("/todo");
  });

  it("rejects other ASCII control characters below 0x20", () => {
    expect(safeNextPath("/todo\x01", "/todo")).toBe("/todo");
  });

  it("rejects the DEL control character (0x7f)", () => {
    expect(safeNextPath("/todo\x7f", "/todo")).toBe("/todo");
  });
});
