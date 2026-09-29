import { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { CompoundRead, UnitRead } from "../app/backendApi";
import { units } from "./generated-mocks/units.mock";
import { compound } from "./generated-mocks/project.mock";
import {
  buildMolecularMassHelper,
  canConvert,
  conversionMultiplier,
  ConversionHelper,
} from "../shared/unitConversion";

// These tests have no UI; they exercise the pure conversion utilities against
// the backend-generated unit mocks (which carry myokit-computed conversion
// factors) and assert the frontend maths reproduces them exactly.
const UnitConversionTests = () => <div>Unit conversion tests</div>;

const allUnits = units as unknown as UnitRead[];
const testCompound = compound as unknown as CompoundRead;

const drugHelper = buildMolecularMassHelper(testCompound, allUnits, "compound");

const meta: Meta<typeof UnitConversionTests> = {
  title: "Utils/Unit Conversion",
  component: UnitConversionTests,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const MolToGramRequiresHelper: Story = {
  play: async () => {
    // kg (mass) and mol (amount) have different exponent vectors, so they are
    // only convertible when a molecular-mass helper is supplied.
    const kg = allUnits.find((u) => u.symbol === "kg");
    const mol = allUnits.find((u) => u.symbol === "mol");
    expect(kg, "kg unit present").toBeTruthy();
    expect(mol, "mol unit present").toBeTruthy();
    if (!kg || !mol) {
      return;
    }

    expect(canConvert(kg, mol)).toBe(false);
    expect(canConvert(kg, mol, [drugHelper as ConversionHelper])).toBe(true);
    // 1 kg -> mol with 500 g/mol: 10**(3-0) / 500 = 2.0
    expect(
      conversionMultiplier(kg, mol, [drugHelper as ConversionHelper]),
    ).toBeCloseTo(2.0, 9);
  },
};
