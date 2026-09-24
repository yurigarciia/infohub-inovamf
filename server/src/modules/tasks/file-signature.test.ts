import { describe, expect, it } from "vitest";
import { matchesSignature } from "./file-signature.js";

const head = (bytes: number[]) => {
  const b = Buffer.alloc(12);
  Buffer.from(bytes).copy(b);
  return b;
};
const ascii = (s: string, offset = 0) => {
  const b = Buffer.alloc(12);
  Buffer.from(s, "latin1").copy(b, offset);
  return b;
};

describe("matchesSignature — o conteúdo precisa bater com o tipo declarado", () => {
  it("PDF", () => {
    expect(matchesSignature("application/pdf", ascii("%PDF-1.7"))).toBe(true);
    expect(matchesSignature("application/pdf", ascii("<html><scr"))).toBe(false);
  });
  it("PNG", () => {
    expect(matchesSignature("image/png", head([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(matchesSignature("image/png", head([0xff, 0xd8, 0xff, 0xe0]))).toBe(false);
  });
  it("JPEG", () => {
    expect(matchesSignature("image/jpeg", head([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(matchesSignature("image/jpeg", head([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });
  it("MP4 (ftyp no offset 4)", () => {
    expect(matchesSignature("video/mp4", ascii("ftypmp42", 4))).toBe(true);
    expect(matchesSignature("video/mp4", ascii("ftypmp42", 0))).toBe(false);
  });
  it("tipo desconhecido nunca passa", () => {
    expect(matchesSignature("text/html", ascii("<html>"))).toBe(false);
    expect(matchesSignature("application/x-msdownload", ascii("MZ"))).toBe(false);
  });
});
