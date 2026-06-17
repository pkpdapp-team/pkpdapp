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
