import { CompoundRead, Unit, UnitRead } from "../app/backendApi";

/**
 * Frontend reimplementation of the unit-conversion maths that the backend
 * computes via the myokit library (see myokit/_unit.py `Unit.conversion_factor`
 * and `Unit.close_exponent`, and pkpdapp/models/units.py `convert_to`).
 *
 * A unit is described by seven SI exponents [g, m, s, A, K, cd, mol] and a
 * `multiplier` stored as a base-10 logarithm. Two units are convertible when
 * their exponent vectors are equal; the conversion factor is then
 * 10**(mult_from - mult_to).
 *
 * Conversions between otherwise-incompatible units (notably mol <-> g) are made
 * possible by a "helper" unit such as the compound's molecular mass (e.g.
 * 500 [g/mol]). The helper is applied by multiplying or dividing the source
 * unit's exponent vector, mirroring myokit's helper handling.
 */

type AnyUnit = Unit | UnitRead;

/** A molecular-mass helper: a unit (for its exponents/multiplier) and a value. */
export interface ConversionHelper {
  unit: AnyUnit;
  value: number;
}

const EXPONENT_TOLERANCE = 1e-9;

/** SI exponent vector [g, m, s, A, K, cd, mol], defaulting missing fields to 0. */
export function exponents(u: AnyUnit): number[] {
  return [
    u.g ?? 0,
    u.m ?? 0,
    u.s ?? 0,
    u.A ?? 0,
    u.K ?? 0,
    u.cd ?? 0,
    u.mol ?? 0,
  ];
}

/** True if two exponent vectors are equal within `tol`. */
export function closeExponent(
  a: number[],
  b: number[],
  tol: number = EXPONENT_TOLERANCE,
): boolean {
  return a.every((x, i) => Math.abs(x - b[i]) <= tol);
}

/**
 * The conversion factor `c` such that `1 [from] * c = 1 [to]`, or `null` if the
 * units cannot be converted (optionally with the help of `helpers`).
 *
 * Direct case: `10**(from.multiplier - to.multiplier)`.
 * Helper case: try `from * helperUnit` then `from / helperUnit`; if the
 * resulting exponents match `to`, fold the helper's value into the factor.
 */
export function conversionMultiplier(
  from: AnyUnit,
  to: AnyUnit,
  helpers: ConversionHelper[] = [],
): number | null {
  const fromExp = exponents(from);
  const toExp = exponents(to);
  const fromMult = from.multiplier ?? 0;
  const toMult = to.multiplier ?? 0;

  // Directly convertible.
  if (closeExponent(fromExp, toExp)) {
    return Math.pow(10, fromMult - toMult);
  }

  // Try conversion via one of the helpers.
  for (const helper of helpers) {
    const helperExp = exponents(helper.unit);
    const helperMult = helper.unit.multiplier ?? 0;

    // from * helperUnit
    const mulExp = fromExp.map((x, i) => x + helperExp[i]);
    if (closeExponent(mulExp, toExp)) {
      return Math.pow(10, fromMult + helperMult - toMult) * helper.value;
    }

    // from / helperUnit
    const divExp = fromExp.map((x, i) => x - helperExp[i]);
    if (closeExponent(divExp, toExp)) {
      return Math.pow(10, fromMult - helperMult - toMult) / helper.value;
    }
  }

  return null;
}

/**
 * True if `from` can be converted to `to`, optionally with the help of
 * `helpers` (e.g. a molecular-mass unit for mol <-> g conversions).
 */
export function canConvert(
  from: AnyUnit,
  to: AnyUnit,
  helpers: ConversionHelper[] = [],
): boolean {
  return conversionMultiplier(from, to, helpers) !== null;
}

/** Which molecular mass on the compound to use as a helper. */
export type MolecularMassTarget = "compound" | "target" | "target2";

/**
 * Build a molecular-mass helper from a compound, resolving the referenced unit
 * from `units`. Returns `null` if the mass or its unit is unavailable.
 */
export function buildMolecularMassHelper(
  compound: CompoundRead,
  units: UnitRead[],
  target: MolecularMassTarget = "compound",
): ConversionHelper | null {
  let value: number | undefined;
  let unitId: number | undefined;
  if (target === "target") {
    value = compound.target_molecular_mass;
    unitId = compound.target_molecular_mass_unit;
  } else if (target === "target2") {
    value = compound.target2_molecular_mass;
    unitId = compound.target2_molecular_mass_unit;
  } else {
    value = compound.molecular_mass;
    unitId = compound.molecular_mass_unit;
  }

  if (value == null || unitId == null) {
    return null;
  }
  const unit = units.find((u) => u.id === unitId);
  if (!unit) {
    return null;
  }
  return { unit, value };
}

/**
 * A unit that another unit can be converted to, with the multipliers needed to
 * convert a value. Mirrors the shape the backend used to send in the
 * `compatible_units` field of a unit, but with numeric factors.
 *
 * - `conversion_factor` uses the compound (drug) molecular mass for mol <-> g.
 * - `target_conversion_factor` uses the target-1 molecular mass.
 * - `target2_conversion_factor` uses the target-2 molecular mass.
 */
export interface CompatibleUnit {
  id: number;
  symbol: string;
  conversion_factor: number;
  target_conversion_factor: number;
  target2_conversion_factor: number;
}

/** A unit augmented with the frontend-computed list of compatible units. */
export interface UnitReadWithCompatible extends UnitRead {
  compatible_units: CompatibleUnit[];
}

// Backend ordering of compatible units (pkpdapp/models/units.py and the unit
// view's `ordering`): "-g", "-m", "-mol", "-s", "K", "A", "cd", "-multiplier".
// Kept so dropdowns built from compatible_units render in the same order.
function compareUnits(a: UnitRead, b: UnitRead): number {
  const keys: Array<[keyof UnitRead, number]> = [
    ["g", -1],
    ["m", -1],
    ["mol", -1],
    ["s", -1],
    ["K", 1],
    ["A", 1],
    ["cd", 1],
    ["multiplier", -1],
  ];
  for (const [key, dir] of keys) {
    const av = (a[key] as number) ?? 0;
    const bv = (b[key] as number) ?? 0;
    if (av !== bv) {
      return (av - bv) * dir;
    }
  }
  return 0;
}

/**
 * Recreate, on the frontend, the `compatible_units` data the backend used to
 * compute via myokit. For every unit in `units`, find the units it can be
 * converted to (using the compound's molecular masses to bridge mol <-> g when
 * available) and the three conversion factors.
 *
 * Membership and factors are derived purely from `canConvert` /
 * `conversionMultiplier`, which are validated against the backend output in
 * unitConversion.stories.tsx.
 */
export function computeCompatibleUnits(
  units: UnitRead[],
  compound?: CompoundRead,
): UnitReadWithCompatible[] {
  const drugHelper = compound
    ? buildMolecularMassHelper(compound, units, "compound")
    : null;
  const targetHelper = compound
    ? buildMolecularMassHelper(compound, units, "target")
    : null;
  const target2Helper = compound
    ? buildMolecularMassHelper(compound, units, "target2")
    : null;

  const drugHelpers = drugHelper ? [drugHelper] : [];
  const targetHelpers = targetHelper ? [targetHelper] : [];
  const target2Helpers = target2Helper ? [target2Helper] : [];

  const sorted = [...units].sort(compareUnits);

  return units.map((from) => {
    const compatible_units: CompatibleUnit[] = [];
    for (const to of sorted) {
      // Membership mirrors the backend's compound-aware exponent filter: a unit
      // is compatible when the (drug) helper can bridge it. Without a compound
      // this falls back to exact exponent matching.
      const factor = conversionMultiplier(from, to, drugHelpers);
      if (factor === null) {
        continue;
      }
      const target = conversionMultiplier(from, to, targetHelpers);
      const target2 = conversionMultiplier(from, to, target2Helpers);
      compatible_units.push({
        id: to.id,
        symbol: to.symbol,
        conversion_factor: factor,
        target_conversion_factor: target ?? factor,
        target2_conversion_factor: target2 ?? factor,
      });
    }
    return { ...from, compatible_units };
  });
}
