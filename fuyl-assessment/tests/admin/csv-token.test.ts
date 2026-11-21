import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/admin/csv";
import { signAdminToken, verifyAdminToken } from "@/lib/admin/token";

describe("csv", () => {
  it("quotes and escapes", () => {
    expect(csvCell('a "quoted" value')).toBe('"a ""quoted"" value"');
    expect(csvCell(undefined)).toBe('""');
    expect(toCsv(["a", "b"], [[1, "x,y"]])).toBe('"a","b"\r\n"1","x,y"\r\n');
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe("\"'=HYPERLINK(\"\"http://evil\"\")\"");
    expect(csvCell("+91 98765")).toBe("\"'+91 98765\"");
    expect(csvCell("@SUM(A1)")).toBe("\"'@SUM(A1)\"");
  });
});

describe("admin token", () => {
  const secret = "s".repeat(48);
  it("round-trips claims", async () => {
    const t = await signAdminToken({ sub: "abc", sv: 3 }, secret);
    expect(await verifyAdminToken(t, secret)).toEqual({ sub: "abc", sv: 3 });
  });
  it("rejects a wrong secret or a tampered token", async () => {
    const t = await signAdminToken({ sub: "abc", sv: 1 }, secret);
    expect(await verifyAdminToken(t, "x".repeat(48))).toBeNull();
    const [h, p, s] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin", sv: 1, aud: "fuyl-assessment-admin" })).toString("base64url");
    expect(await verifyAdminToken(`${h}.${forged}.${s}`, secret)).toBeNull();
    expect(await verifyAdminToken(`${h}.${p}`, secret)).toBeNull();
  });
});
