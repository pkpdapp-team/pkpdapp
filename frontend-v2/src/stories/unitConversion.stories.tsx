import { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { CompoundRead, UnitRead } from "../app/backendApi";
import { units } from "./generated-mocks/units.mock";
import { compound } from "./generated-mocks/project.mock";
import { unitCompatibility } from "./unitConversion.fixture";
import {
  buildMolecularMassHelper,
  canConvert,
  computeCompatibleUnits,
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
const targetHelper = buildMolecularMassHelper(testCompound, allUnits, "target");
const target2Helper = buildMolecularMassHelper(
  testCompound,
  allUnits,
  "target2",
);

// 1 [from] * factor = 1 [to]; compare within a relative tolerance.
function closeRel(actual: number | null, expected: number): boolean {
  if (actual === null) {
    return false;
  }
  if (expected === 0) {
    return Math.abs(actual) < 1e-9;
  }
  return Math.abs(actual - expected) / Math.abs(expected) < 1e-6;
}

const meta: Meta<typeof UnitConversionTests> = {
  title: "Utils/Unit Conversion",
  component: UnitConversionTests,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ParityWithBackend: Story = {
  play: async () => {
    expect(drugHelper).not.toBeNull();
    expect(targetHelper).not.toBeNull();
    expect(target2Helper).not.toBeNull();

    // `unitCompatibility` is a preserved snapshot of the backend-computed
    // conversion factors (see unitConversion.fixture.ts); the SI exponents and
    // multipliers come from the units mock, which the utility actually uses.
    for (const entry of unitCompatibility) {
      const from = allUnits.find((u) => u.id === entry.id);
      expect(from, `unit id ${entry.id} not found in units mock`).toBeTruthy();
      if (!from) {
        continue;
      }

      for (const c of entry.compatible_units) {
        const toId = c.id;
        const to = allUnits.find((u) => u.id === toId);
        expect(
          to,
          `compatible unit id ${toId} (from ${from.symbol}) not found in units`,
        ).toBeTruthy();
        if (!to) {
          continue;
        }

        const label = `${from.symbol} (${from.id}) -> ${c.symbol} (${toId})`;

        // The backend computed compatible_units with the compound context, so
        // each factor corresponds to the relevant molecular-mass helper.
        const base = conversionMultiplier(from, to, [
          drugHelper as ConversionHelper,
        ]);
        const target = conversionMultiplier(from, to, [
          targetHelper as ConversionHelper,
        ]);
        const target2 = conversionMultiplier(from, to, [
          target2Helper as ConversionHelper,
        ]);

        expect(
          canConvert(from, to, [drugHelper as ConversionHelper]),
          `canConvert ${label}`,
        ).toBe(true);
        expect(
          closeRel(base, Number(c.conversion_factor)),
          `conversion_factor ${label}: got ${base}, want ${c.conversion_factor}`,
        ).toBe(true);
        expect(
          closeRel(target, Number(c.target_conversion_factor)),
          `target_conversion_factor ${label}: got ${target}, want ${c.target_conversion_factor}`,
        ).toBe(true);
        expect(
          closeRel(target2, Number(c.target2_conversion_factor)),
          `target2_conversion_factor ${label}: got ${target2}, want ${c.target2_conversion_factor}`,
        ).toBe(true);
      }
    }
  },
};

export const ComputeMatchesBackend: Story = {
  play: async () => {
    // computeCompatibleUnits is what the frontend uses in place of the
    // backend's compatible_units field. Assert it reproduces the preserved
    // backend snapshot exactly: same membership, ordering, and all three
    // conversion factors, for every unit.
    const computed = computeCompatibleUnits(allUnits, testCompound);

    expect(computed.length).toBe(unitCompatibility.length);

    for (const expected of unitCompatibility) {
      const actual = computed.find((u) => u.id === expected.id);
      expect(actual, `unit id ${expected.id} missing from computed`).toBeTruthy();
      if (!actual) {
        continue;
      }

      // Same set and order of compatible unit ids.
      const actualIds = actual.compatible_units.map((c) => c.id);
      const expectedIds = expected.compatible_units.map((c) => c.id);
      expect(
        actualIds,
        `compatible unit ids for ${expected.symbol} (${expected.id})`,
      ).toEqual(expectedIds);

      for (const ec of expected.compatible_units) {
        const ac = actual.compatible_units.find((c) => c.id === ec.id);
        const label = `${expected.symbol} (${expected.id}) -> ${ec.symbol} (${ec.id})`;
        expect(ac, `compatible unit ${label} missing`).toBeTruthy();
        if (!ac) {
          continue;
        }
        expect(
          closeRel(ac.conversion_factor, Number(ec.conversion_factor)),
          `conversion_factor ${label}: got ${ac.conversion_factor}, want ${ec.conversion_factor}`,
        ).toBe(true);
        expect(
          closeRel(
            ac.target_conversion_factor,
            Number(ec.target_conversion_factor),
          ),
          `target_conversion_factor ${label}: got ${ac.target_conversion_factor}, want ${ec.target_conversion_factor}`,
        ).toBe(true);
        expect(
          closeRel(
            ac.target2_conversion_factor,
            Number(ec.target2_conversion_factor),
          ),
          `target2_conversion_factor ${label}: got ${ac.target2_conversion_factor}, want ${ec.target2_conversion_factor}`,
        ).toBe(true);
      }
    }
  },
};

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
