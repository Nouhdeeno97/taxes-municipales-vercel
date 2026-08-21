import { describe, expect, it } from "vitest";
import { paginatedListInput } from "./routers/municipal";

describe("contrat de pagination des registres", () => {
  it("applique la première page et une taille de 25 lignes par défaut", () => {
    expect(paginatedListInput.parse({})).toEqual({ page: 0, pageSize: 25 });
  });

  it("accepte les tailles adaptées aux tableaux métier", () => {
    expect(paginatedListInput.parse({ page: 3, pageSize: 10 })).toEqual({ page: 3, pageSize: 10 });
  });

  it("refuse les tailles excessives ou les pages négatives", () => {
    expect(() => paginatedListInput.parse({ page: -1, pageSize: 25 })).toThrow();
    expect(() => paginatedListInput.parse({ page: 0, pageSize: 101 })).toThrow();
  });
});
