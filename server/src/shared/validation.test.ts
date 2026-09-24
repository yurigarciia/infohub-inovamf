import { describe, expect, it } from "vitest";
import { dateOnly, httpUrl, limitQuery, requiredText } from "./validation.js";

describe("dateOnly — data real do calendário", () => {
  it.each(["2030-06-15", "2028-02-29", "2026-12-31", "2000-01-01"])("aceita %s", (d) => {
    expect(dateOnly.safeParse(d).success).toBe(true);
  });
  it.each(["2030-13-45", "2030-02-30", "2030-02-29", "2030-00-10", "2030-04-31", "15/06/2030", "2030-6-5", "", "2030-06-15T00:00:00Z"])(
    "recusa %j",
    (d) => {
      expect(dateOnly.safeParse(d).success).toBe(false);
    },
  );
});

describe("httpUrl — só http(s) (o link vira <a href>)", () => {
  it.each(["https://youtu.be/abc", "http://exemplo.com/a?b=1", "  https://drive.google.com/x  "])("aceita %j", (u) => {
    expect(httpUrl.safeParse(u).success).toBe(true);
  });
  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://exemplo.com/a",
    "file:///etc/passwd",
    "//exemplo.com/a",
    "não é url",
    "",
  ])("recusa %j", (u) => {
    expect(httpUrl.safeParse(u).success).toBe(false);
  });
});

describe("requiredText", () => {
  it("apara espaços e exige conteúdo", () => {
    expect(requiredText().parse("  oi  ")).toBe("oi");
    expect(requiredText().safeParse("   ").success).toBe(false);
    expect(requiredText().safeParse("").success).toBe(false);
  });
  it("respeita o máximo", () => {
    expect(requiredText(5).safeParse("123456").success).toBe(false);
    expect(requiredText(5).safeParse("12345").success).toBe(true);
  });
});

describe("limitQuery", () => {
  it("opcional, inteiro 1..500", () => {
    expect(limitQuery.parse(undefined)).toBeUndefined();
    expect(limitQuery.parse("50")).toBe(50);
    for (const bad of ["abc", "0", "-1", "501", "1.5", "999999"]) expect(limitQuery.safeParse(bad).success).toBe(false);
  });
});
