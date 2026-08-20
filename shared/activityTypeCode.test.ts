import { describe, expect, it } from "vitest";
import { makeActivityTypeCode } from "./activityTypeCode";

describe("makeActivityTypeCode", () => {
  it("normalise un libellé accentué en code de type réutilisable", () => {
    expect(makeActivityTypeCode("Lavage automobile & entretien")).toBe("ACT-LAVAGE-AUTOMOBILE-ENTRETIEN");
  });

  it("produit un code valide lorsque le libellé ne contient aucun caractère alphanumérique", () => {
    expect(makeActivityTypeCode("---", "CAT")).toBe("CAT-TYPE");
  });
});
