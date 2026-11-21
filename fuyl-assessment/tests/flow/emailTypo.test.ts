import { describe, expect, it } from "vitest";
import { suggestEmail } from "@/lib/emailTypo";

describe("suggestEmail", () => {
  it("catches common domain typos", () => {
    expect(suggestEmail("riya@gmial.com")).toBe("riya@gmail.com");
    expect(suggestEmail("riya@gmail.con")).toBe("riya@gmail.com");
    expect(suggestEmail("riya@gmal.com")).toBe("riya@gmail.com");
    expect(suggestEmail("riya@yahooo.com")).toBe("riya@yahoo.com");
    expect(suggestEmail("riya@hotmial.com")).toBe("riya@hotmail.com");
    expect(suggestEmail("riya@outlok.com")).toBe("riya@outlook.com");
    expect(suggestEmail("riya@rediffmial.com")).toBe("riya@rediffmail.com");
    expect(suggestEmail(" Riya@GMIAL.com ")).toBe("riya@gmail.com");
  });

  it("leaves correct and unrelated domains alone", () => {
    expect(suggestEmail("riya@gmail.com")).toBeNull();
    expect(suggestEmail("riya@adriindia.org")).toBeNull();
    expect(suggestEmail("riya@company.co.in")).toBeNull();
    expect(suggestEmail("not-an-email")).toBeNull();
    expect(suggestEmail("riya@")).toBeNull();
  });
});
