/** O cabeçalho do arquivo bate com o tipo declarado? */
export function matchesSignature(mime: string, head: Buffer): boolean {
  switch (mime) {
    case "application/pdf":
      return head.subarray(0, 5).toString("latin1") === "%PDF-";
    case "image/png":
      return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "video/mp4":
      return head.subarray(4, 8).toString("latin1") === "ftyp";
    default:
      return false;
  }
}
