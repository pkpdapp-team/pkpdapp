// Backend-derived unit compatibility/conversion fixture for unit-conversion tests.
//
// This data was originally produced by the backend (myokit) and shipped in the
// "compatible_units" field of each UnitRead via the generated mock
// (src/stories/generated-mocks/units.mock.ts). That field is being removed from
// the API, so this snapshot is preserved here as the source of truth for the
// frontend conversion-parity test (unitConversion.stories.tsx).
//
// Each entry pairs a unit id/symbol with the conversion factors the backend
// computed (using the Storybook test compound: molecular_mass 500 [g/mol],
// target/target2 molecular mass 25000 [g/mol]).

export interface CompatibleUnit {
  id: number;
  symbol: string;
  conversion_factor: number;
  target_conversion_factor: number;
  target2_conversion_factor: number;
}

export interface UnitCompatibility {
  id: number;
  symbol: string;
  compatible_units: CompatibleUnit[];
}

export const unitCompatibility: UnitCompatibility[] = [
  {
    "id": 41,
    "symbol": "kg",
    "compatible_units": [
      {
        "id": 41,
        "symbol": "kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 42,
        "symbol": "g",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 11,
        "symbol": "mg",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 102,
        "symbol": "µg",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 43,
        "symbol": "ng",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      },
      {
        "id": 2,
        "symbol": "mol",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 5,
        "symbol": "µmol",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 3,
        "symbol": "nmol",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 4,
        "symbol": "pmol",
        "conversion_factor": 2000000000000,
        "target_conversion_factor": 40000000000,
        "target2_conversion_factor": 40000000000
      }
    ]
  },
  {
    "id": 42,
    "symbol": "g",
    "compatible_units": [
      {
        "id": 41,
        "symbol": "kg",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 42,
        "symbol": "g",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 11,
        "symbol": "mg",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 102,
        "symbol": "µg",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 43,
        "symbol": "ng",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 2,
        "symbol": "mol",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 5,
        "symbol": "µmol",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 3,
        "symbol": "nmol",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 4,
        "symbol": "pmol",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      }
    ]
  },
  {
    "id": 11,
    "symbol": "mg",
    "compatible_units": [
      {
        "id": 41,
        "symbol": "kg",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 42,
        "symbol": "g",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 11,
        "symbol": "mg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 102,
        "symbol": "µg",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 43,
        "symbol": "ng",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 2,
        "symbol": "mol",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 5,
        "symbol": "µmol",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 3,
        "symbol": "nmol",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 4,
        "symbol": "pmol",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      }
    ]
  },
  {
    "id": 102,
    "symbol": "µg",
    "compatible_units": [
      {
        "id": 41,
        "symbol": "kg",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 42,
        "symbol": "g",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 11,
        "symbol": "mg",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 102,
        "symbol": "µg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 43,
        "symbol": "ng",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 2,
        "symbol": "mol",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 5,
        "symbol": "µmol",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 3,
        "symbol": "nmol",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 4,
        "symbol": "pmol",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      }
    ]
  },
  {
    "id": 43,
    "symbol": "ng",
    "compatible_units": [
      {
        "id": 41,
        "symbol": "kg",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 42,
        "symbol": "g",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 11,
        "symbol": "mg",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 102,
        "symbol": "µg",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 43,
        "symbol": "ng",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 2,
        "symbol": "mol",
        "conversion_factor": 2e-12,
        "target_conversion_factor": 4e-14,
        "target2_conversion_factor": 4e-14
      },
      {
        "id": 5,
        "symbol": "µmol",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 3,
        "symbol": "nmol",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 4,
        "symbol": "pmol",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      }
    ]
  },
  {
    "id": 95,
    "symbol": "g/h",
    "compatible_units": [
      {
        "id": 95,
        "symbol": "g/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 93,
        "symbol": "mg/h",
        "conversion_factor": 1000.000000000001,
        "target_conversion_factor": 1000.000000000001,
        "target2_conversion_factor": 1000.000000000001
      },
      {
        "id": 92,
        "symbol": "µg/h",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 94,
        "symbol": "ng/h",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 91,
        "symbol": "pg/h",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      },
      {
        "id": 77,
        "symbol": "mol/h",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 80,
        "symbol": "µmol/h",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 78,
        "symbol": "nmol/h",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 75,
        "symbol": "[kat (2.777777777777775e-16)]",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 79,
        "symbol": "pmol/h",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      }
    ]
  },
  {
    "id": 93,
    "symbol": "mg/h",
    "compatible_units": [
      {
        "id": 95,
        "symbol": "g/h",
        "conversion_factor": 0.000999999999999999,
        "target_conversion_factor": 0.000999999999999999,
        "target2_conversion_factor": 0.000999999999999999
      },
      {
        "id": 93,
        "symbol": "mg/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 92,
        "symbol": "µg/h",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 94,
        "symbol": "ng/h",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 91,
        "symbol": "pg/h",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 77,
        "symbol": "mol/h",
        "conversion_factor": 0.000001999999999999998,
        "target_conversion_factor": 3.9999999999999955e-8,
        "target2_conversion_factor": 3.9999999999999955e-8
      },
      {
        "id": 80,
        "symbol": "µmol/h",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 78,
        "symbol": "nmol/h",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 75,
        "symbol": "[kat (2.777777777777775e-16)]",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 79,
        "symbol": "pmol/h",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      }
    ]
  },
  {
    "id": 92,
    "symbol": "µg/h",
    "compatible_units": [
      {
        "id": 95,
        "symbol": "g/h",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 93,
        "symbol": "mg/h",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 92,
        "symbol": "µg/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 94,
        "symbol": "ng/h",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 91,
        "symbol": "pg/h",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 77,
        "symbol": "mol/h",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 80,
        "symbol": "µmol/h",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 78,
        "symbol": "nmol/h",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 75,
        "symbol": "[kat (2.777777777777775e-16)]",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 79,
        "symbol": "pmol/h",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      }
    ]
  },
  {
    "id": 94,
    "symbol": "ng/h",
    "compatible_units": [
      {
        "id": 95,
        "symbol": "g/h",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 93,
        "symbol": "mg/h",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 92,
        "symbol": "µg/h",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 94,
        "symbol": "ng/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 91,
        "symbol": "pg/h",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 77,
        "symbol": "mol/h",
        "conversion_factor": 2e-12,
        "target_conversion_factor": 4e-14,
        "target2_conversion_factor": 4e-14
      },
      {
        "id": 80,
        "symbol": "µmol/h",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 78,
        "symbol": "nmol/h",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 75,
        "symbol": "[kat (2.777777777777775e-16)]",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 79,
        "symbol": "pmol/h",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      }
    ]
  },
  {
    "id": 91,
    "symbol": "pg/h",
    "compatible_units": [
      {
        "id": 95,
        "symbol": "g/h",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 93,
        "symbol": "mg/h",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 92,
        "symbol": "µg/h",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 94,
        "symbol": "ng/h",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 91,
        "symbol": "pg/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 77,
        "symbol": "mol/h",
        "conversion_factor": 2e-15,
        "target_conversion_factor": 3.9999999999999997e-17,
        "target2_conversion_factor": 3.9999999999999997e-17
      },
      {
        "id": 80,
        "symbol": "µmol/h",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 78,
        "symbol": "nmol/h",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 75,
        "symbol": "[kat (2.777777777777775e-16)]",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 79,
        "symbol": "pmol/h",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      }
    ]
  },
  {
    "id": 55,
    "symbol": "g/nmol",
    "compatible_units": [
      {
        "id": 55,
        "symbol": "g/nmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 98,
        "symbol": "kg/mol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 54,
        "symbol": "g/mol",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 53,
        "symbol": "",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 66,
        "symbol": "mg/kg",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 69,
        "symbol": "µg/kg",
        "conversion_factor": 2000000000000,
        "target_conversion_factor": 40000000000,
        "target2_conversion_factor": 40000000000
      },
      {
        "id": 68,
        "symbol": "ng/kg",
        "conversion_factor": 2000000000000000,
        "target_conversion_factor": 40000000000000,
        "target2_conversion_factor": 40000000000000
      },
      {
        "id": 67,
        "symbol": "pg/kg",
        "conversion_factor": 2000000000000000000,
        "target_conversion_factor": 40000000000000000,
        "target2_conversion_factor": 40000000000000000
      }
    ]
  },
  {
    "id": 98,
    "symbol": "kg/mol",
    "compatible_units": [
      {
        "id": 55,
        "symbol": "g/nmol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 98,
        "symbol": "kg/mol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 54,
        "symbol": "g/mol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 53,
        "symbol": "",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 66,
        "symbol": "mg/kg",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 69,
        "symbol": "µg/kg",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 68,
        "symbol": "ng/kg",
        "conversion_factor": 2000000000000,
        "target_conversion_factor": 40000000000,
        "target2_conversion_factor": 40000000000
      },
      {
        "id": 67,
        "symbol": "pg/kg",
        "conversion_factor": 2000000000000000,
        "target_conversion_factor": 40000000000000,
        "target2_conversion_factor": 40000000000000
      }
    ]
  },
  {
    "id": 54,
    "symbol": "g/mol",
    "compatible_units": [
      {
        "id": 55,
        "symbol": "g/nmol",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 98,
        "symbol": "kg/mol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 54,
        "symbol": "g/mol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 53,
        "symbol": "",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 66,
        "symbol": "mg/kg",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 69,
        "symbol": "µg/kg",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 68,
        "symbol": "ng/kg",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 67,
        "symbol": "pg/kg",
        "conversion_factor": 2000000000000,
        "target_conversion_factor": 40000000000,
        "target2_conversion_factor": 40000000000
      }
    ]
  },
  {
    "id": 100,
    "symbol": "day*mg/mL",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 23.999999999999968,
        "target_conversion_factor": 23.999999999999968,
        "target2_conversion_factor": 23.999999999999968
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 24000.00000000002,
        "target_conversion_factor": 24000.00000000002,
        "target2_conversion_factor": 24000.00000000002
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 23999999.99999997,
        "target_conversion_factor": 23999999.99999997,
        "target2_conversion_factor": 23999999.99999997
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 48000.00000000004,
        "target_conversion_factor": 960.0000000000008,
        "target2_conversion_factor": 960.0000000000008
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 48000000.00000004,
        "target_conversion_factor": 960000.0000000008,
        "target2_conversion_factor": 960000.0000000008
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 48000000000.00004,
        "target_conversion_factor": 960000000.0000008,
        "target2_conversion_factor": 960000000.0000008
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 172800000000000.3,
        "target_conversion_factor": 3456000000000.0063,
        "target2_conversion_factor": 3456000000000.0063
      }
    ]
  },
  {
    "id": 99,
    "symbol": "h*mg/mL",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 0.04166666666666672,
        "target_conversion_factor": 0.04166666666666672,
        "target2_conversion_factor": 0.04166666666666672
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 41.66666666666672,
        "target_conversion_factor": 41.66666666666672,
        "target2_conversion_factor": 41.66666666666672
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 1000.000000000001,
        "target_conversion_factor": 1000.000000000001,
        "target2_conversion_factor": 1000.000000000001
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 41666.66666666672,
        "target_conversion_factor": 41666.66666666672,
        "target2_conversion_factor": 41666.66666666672
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 83.33333333333344,
        "target_conversion_factor": 1.666666666666669,
        "target2_conversion_factor": 1.666666666666669
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 83333.33333333343,
        "target_conversion_factor": 1666.6666666666686,
        "target2_conversion_factor": 1666.6666666666686
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 83333333.33333327,
        "target_conversion_factor": 1666666.6666666653,
        "target2_conversion_factor": 1666666.6666666653
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 7200000000000.007,
        "target_conversion_factor": 144000000000.00015,
        "target2_conversion_factor": 144000000000.00015
      }
    ]
  },
  {
    "id": 65,
    "symbol": "day*µg/mL",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 0.02399999999999997,
        "target_conversion_factor": 0.02399999999999997,
        "target2_conversion_factor": 0.02399999999999997
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 23.999999999999993,
        "target_conversion_factor": 23.999999999999993,
        "target2_conversion_factor": 23.999999999999993
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 23999.99999999997,
        "target_conversion_factor": 23999.99999999997,
        "target2_conversion_factor": 23999.99999999997
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 48.000000000000036,
        "target_conversion_factor": 0.9600000000000007,
        "target2_conversion_factor": 0.9600000000000007
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 47999.99999999994,
        "target_conversion_factor": 959.9999999999989,
        "target2_conversion_factor": 959.9999999999989
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 48000000.00000004,
        "target_conversion_factor": 960000.0000000008,
        "target2_conversion_factor": 960000.0000000008
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 172800000000.0003,
        "target_conversion_factor": 3456000000.000006,
        "target2_conversion_factor": 3456000000.000006
      }
    ]
  },
  {
    "id": 60,
    "symbol": "h*µg/mL",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 0.00004166666666666663,
        "target_conversion_factor": 0.00004166666666666663,
        "target2_conversion_factor": 0.00004166666666666663
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 0.000999999999999999,
        "target_conversion_factor": 0.000999999999999999,
        "target2_conversion_factor": 0.000999999999999999
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 0.04166666666666668,
        "target_conversion_factor": 0.04166666666666668,
        "target2_conversion_factor": 0.04166666666666668
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 41.66666666666668,
        "target_conversion_factor": 41.66666666666668,
        "target2_conversion_factor": 41.66666666666668
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 999.999999999999,
        "target_conversion_factor": 999.999999999999,
        "target2_conversion_factor": 999.999999999999
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 0.08333333333333336,
        "target_conversion_factor": 0.0016666666666666672,
        "target2_conversion_factor": 0.0016666666666666672
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 83.33333333333327,
        "target_conversion_factor": 1.6666666666666654,
        "target2_conversion_factor": 1.6666666666666654
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 83333.33333333327,
        "target_conversion_factor": 1666.6666666666654,
        "target2_conversion_factor": 1666.6666666666654
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 7200000000.000008,
        "target_conversion_factor": 144000000.00000015,
        "target2_conversion_factor": 144000000.00000015
      }
    ]
  },
  {
    "id": 64,
    "symbol": "day*ng/mL",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 0.00002399999999999997,
        "target_conversion_factor": 0.00002399999999999997,
        "target2_conversion_factor": 0.00002399999999999997
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 0.023999999999999994,
        "target_conversion_factor": 0.023999999999999994,
        "target2_conversion_factor": 0.023999999999999994
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 23.999999999999968,
        "target_conversion_factor": 23.999999999999968,
        "target2_conversion_factor": 23.999999999999968
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 0.04799999999999999,
        "target_conversion_factor": 0.0009599999999999997,
        "target2_conversion_factor": 0.0009599999999999997
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 47.99999999999994,
        "target_conversion_factor": 0.9599999999999989,
        "target2_conversion_factor": 0.9599999999999989
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 47999.99999999994,
        "target_conversion_factor": 959.9999999999989,
        "target2_conversion_factor": 959.9999999999989
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 172800000.0000003,
        "target_conversion_factor": 3456000.000000006,
        "target2_conversion_factor": 3456000.000000006
      }
    ]
  },
  {
    "id": 59,
    "symbol": "h*ng/mL",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 4.166666666666672e-8,
        "target_conversion_factor": 4.166666666666672e-8,
        "target2_conversion_factor": 4.166666666666672e-8
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 0.00004166666666666672,
        "target_conversion_factor": 0.00004166666666666672,
        "target2_conversion_factor": 0.00004166666666666672
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 0.001000000000000001,
        "target_conversion_factor": 0.001000000000000001,
        "target2_conversion_factor": 0.001000000000000001
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 0.04166666666666672,
        "target_conversion_factor": 0.04166666666666672,
        "target2_conversion_factor": 0.04166666666666672
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 0.00008333333333333344,
        "target_conversion_factor": 0.0000016666666666666688,
        "target2_conversion_factor": 0.0000016666666666666688
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 0.002000000000000002,
        "target_conversion_factor": 0.000040000000000000044,
        "target2_conversion_factor": 0.000040000000000000044
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 0.08333333333333344,
        "target_conversion_factor": 0.001666666666666669,
        "target2_conversion_factor": 0.001666666666666669
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 83.33333333333344,
        "target_conversion_factor": 1.666666666666669,
        "target2_conversion_factor": 1.666666666666669
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 7200000.000000007,
        "target_conversion_factor": 144000.00000000015,
        "target2_conversion_factor": 144000.00000000015
      }
    ]
  },
  {
    "id": 97,
    "symbol": "g/mL",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 100,
        "target_conversion_factor": 100,
        "target2_conversion_factor": 100
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 1000000000000000,
        "target_conversion_factor": 1000000000000000,
        "target2_conversion_factor": 1000000000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 2000000000000,
        "target_conversion_factor": 40000000000,
        "target2_conversion_factor": 40000000000
      }
    ]
  },
  {
    "id": 52,
    "symbol": "g/dL",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 0.01,
        "target_conversion_factor": 0.01,
        "target2_conversion_factor": 0.01
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 10,
        "target_conversion_factor": 10,
        "target2_conversion_factor": 10
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 10,
        "target_conversion_factor": 10,
        "target2_conversion_factor": 10
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 10000,
        "target_conversion_factor": 10000,
        "target2_conversion_factor": 10000
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 10000,
        "target_conversion_factor": 10000,
        "target2_conversion_factor": 10000
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 10000000,
        "target_conversion_factor": 10000000,
        "target2_conversion_factor": 10000000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 10000000,
        "target_conversion_factor": 10000000,
        "target2_conversion_factor": 10000000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 10000000000,
        "target_conversion_factor": 10000000000,
        "target2_conversion_factor": 10000000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 10000000000,
        "target_conversion_factor": 10000000000,
        "target2_conversion_factor": 10000000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 10000000000000,
        "target_conversion_factor": 10000000000000,
        "target2_conversion_factor": 10000000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 0.00002,
        "target_conversion_factor": 4e-7,
        "target2_conversion_factor": 4e-7
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 0.02,
        "target_conversion_factor": 0.0004,
        "target2_conversion_factor": 0.0004
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 0.02,
        "target_conversion_factor": 0.0004,
        "target2_conversion_factor": 0.0004
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 20,
        "target_conversion_factor": 0.4,
        "target2_conversion_factor": 0.4
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 20,
        "target_conversion_factor": 0.4,
        "target2_conversion_factor": 0.4
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 20000,
        "target_conversion_factor": 400,
        "target2_conversion_factor": 400
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 20000,
        "target_conversion_factor": 400,
        "target2_conversion_factor": 400
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 20000000,
        "target_conversion_factor": 400000,
        "target2_conversion_factor": 400000
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 20000000,
        "target_conversion_factor": 400000,
        "target2_conversion_factor": 400000
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 20000000000,
        "target_conversion_factor": 400000000,
        "target2_conversion_factor": 400000000
      }
    ]
  },
  {
    "id": 47,
    "symbol": "g/L",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 0.1,
        "target_conversion_factor": 0.1,
        "target2_conversion_factor": 0.1
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      }
    ]
  },
  {
    "id": 96,
    "symbol": "mg/mL",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 0.1,
        "target_conversion_factor": 0.1,
        "target2_conversion_factor": 0.1
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      }
    ]
  },
  {
    "id": 45,
    "symbol": "mg/L",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 0.0001,
        "target_conversion_factor": 0.0001,
        "target2_conversion_factor": 0.0001
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      }
    ]
  },
  {
    "id": 49,
    "symbol": "µg/mL",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 0.0001,
        "target_conversion_factor": 0.0001,
        "target2_conversion_factor": 0.0001
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      }
    ]
  },
  {
    "id": 44,
    "symbol": "ng/mL",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 1e-7,
        "target_conversion_factor": 1e-7,
        "target2_conversion_factor": 1e-7
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 2e-12,
        "target_conversion_factor": 4e-14,
        "target2_conversion_factor": 4e-14
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      }
    ]
  },
  {
    "id": 90,
    "symbol": "µg/L",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 1e-7,
        "target_conversion_factor": 1e-7,
        "target2_conversion_factor": 1e-7
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 2e-12,
        "target_conversion_factor": 4e-14,
        "target2_conversion_factor": 4e-14
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      }
    ]
  },
  {
    "id": 46,
    "symbol": "ng/L",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 1e-10,
        "target_conversion_factor": 1e-10,
        "target2_conversion_factor": 1e-10
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 2e-15,
        "target_conversion_factor": 3.9999999999999997e-17,
        "target2_conversion_factor": 3.9999999999999997e-17
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 2e-12,
        "target_conversion_factor": 4e-14,
        "target2_conversion_factor": 4e-14
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 2e-12,
        "target_conversion_factor": 4e-14,
        "target2_conversion_factor": 4e-14
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      }
    ]
  },
  {
    "id": 48,
    "symbol": "pg/mL",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 1e-10,
        "target_conversion_factor": 1e-10,
        "target2_conversion_factor": 1e-10
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 2e-15,
        "target_conversion_factor": 3.9999999999999997e-17,
        "target2_conversion_factor": 3.9999999999999997e-17
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 2e-12,
        "target_conversion_factor": 4e-14,
        "target2_conversion_factor": 4e-14
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 2e-12,
        "target_conversion_factor": 4e-14,
        "target2_conversion_factor": 4e-14
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      }
    ]
  },
  {
    "id": 89,
    "symbol": "pg/L",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 1e-15,
        "target_conversion_factor": 1e-15,
        "target2_conversion_factor": 1e-15
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 1e-13,
        "target_conversion_factor": 1e-13,
        "target2_conversion_factor": 1e-13
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 2e-18,
        "target_conversion_factor": 4.0000000000000004e-20,
        "target2_conversion_factor": 4.0000000000000004e-20
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 2e-15,
        "target_conversion_factor": 3.9999999999999997e-17,
        "target2_conversion_factor": 3.9999999999999997e-17
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 2e-15,
        "target_conversion_factor": 3.9999999999999997e-17,
        "target2_conversion_factor": 3.9999999999999997e-17
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 2e-12,
        "target_conversion_factor": 4e-14,
        "target2_conversion_factor": 4e-14
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 2e-12,
        "target_conversion_factor": 4e-14,
        "target2_conversion_factor": 4e-14
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      }
    ]
  },
  {
    "id": 32,
    "symbol": "L",
    "compatible_units": [
      {
        "id": 32,
        "symbol": "L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 33,
        "symbol": "mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 101,
        "symbol": "mm³",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      }
    ]
  },
  {
    "id": 33,
    "symbol": "mL",
    "compatible_units": [
      {
        "id": 32,
        "symbol": "L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 33,
        "symbol": "mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 101,
        "symbol": "mm³",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      }
    ]
  },
  {
    "id": 101,
    "symbol": "mm³",
    "compatible_units": [
      {
        "id": 32,
        "symbol": "L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 33,
        "symbol": "mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 101,
        "symbol": "mm³",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 35,
    "symbol": "L/h",
    "compatible_units": [
      {
        "id": 35,
        "symbol": "L/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 36,
        "symbol": "L/day",
        "conversion_factor": 23.999999999999968,
        "target_conversion_factor": 23.999999999999968,
        "target2_conversion_factor": 23.999999999999968
      },
      {
        "id": 38,
        "symbol": "mL/h",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 37,
        "symbol": "mL/day",
        "conversion_factor": 24000.00000000002,
        "target_conversion_factor": 24000.00000000002,
        "target2_conversion_factor": 24000.00000000002
      },
      {
        "id": 39,
        "symbol": "µL/h",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      }
    ]
  },
  {
    "id": 36,
    "symbol": "L/day",
    "compatible_units": [
      {
        "id": 35,
        "symbol": "L/h",
        "conversion_factor": 0.04166666666666672,
        "target_conversion_factor": 0.04166666666666672,
        "target2_conversion_factor": 0.04166666666666672
      },
      {
        "id": 36,
        "symbol": "L/day",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 38,
        "symbol": "mL/h",
        "conversion_factor": 41.66666666666672,
        "target_conversion_factor": 41.66666666666672,
        "target2_conversion_factor": 41.66666666666672
      },
      {
        "id": 37,
        "symbol": "mL/day",
        "conversion_factor": 1000.000000000002,
        "target_conversion_factor": 1000.000000000002,
        "target2_conversion_factor": 1000.000000000002
      },
      {
        "id": 39,
        "symbol": "µL/h",
        "conversion_factor": 41666.66666666672,
        "target_conversion_factor": 41666.66666666672,
        "target2_conversion_factor": 41666.66666666672
      }
    ]
  },
  {
    "id": 38,
    "symbol": "mL/h",
    "compatible_units": [
      {
        "id": 35,
        "symbol": "L/h",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 36,
        "symbol": "L/day",
        "conversion_factor": 0.02399999999999997,
        "target_conversion_factor": 0.02399999999999997,
        "target2_conversion_factor": 0.02399999999999997
      },
      {
        "id": 38,
        "symbol": "mL/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 37,
        "symbol": "mL/day",
        "conversion_factor": 24.000000000000018,
        "target_conversion_factor": 24.000000000000018,
        "target2_conversion_factor": 24.000000000000018
      },
      {
        "id": 39,
        "symbol": "µL/h",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      }
    ]
  },
  {
    "id": 37,
    "symbol": "mL/day",
    "compatible_units": [
      {
        "id": 35,
        "symbol": "L/h",
        "conversion_factor": 0.00004166666666666663,
        "target_conversion_factor": 0.00004166666666666663,
        "target2_conversion_factor": 0.00004166666666666663
      },
      {
        "id": 36,
        "symbol": "L/day",
        "conversion_factor": 0.0009999999999999979,
        "target_conversion_factor": 0.0009999999999999979,
        "target2_conversion_factor": 0.0009999999999999979
      },
      {
        "id": 38,
        "symbol": "mL/h",
        "conversion_factor": 0.04166666666666664,
        "target_conversion_factor": 0.04166666666666664,
        "target2_conversion_factor": 0.04166666666666664
      },
      {
        "id": 37,
        "symbol": "mL/day",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 39,
        "symbol": "µL/h",
        "conversion_factor": 41.666666666666636,
        "target_conversion_factor": 41.666666666666636,
        "target2_conversion_factor": 41.666666666666636
      }
    ]
  },
  {
    "id": 39,
    "symbol": "µL/h",
    "compatible_units": [
      {
        "id": 35,
        "symbol": "L/h",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 36,
        "symbol": "L/day",
        "conversion_factor": 0.00002399999999999997,
        "target_conversion_factor": 0.00002399999999999997,
        "target2_conversion_factor": 0.00002399999999999997
      },
      {
        "id": 38,
        "symbol": "mL/h",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 37,
        "symbol": "mL/day",
        "conversion_factor": 0.024000000000000018,
        "target_conversion_factor": 0.024000000000000018,
        "target2_conversion_factor": 0.024000000000000018
      },
      {
        "id": 39,
        "symbol": "µL/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 23,
    "symbol": "L/h/pmol",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 23.999999999999968,
        "target_conversion_factor": 23.999999999999968,
        "target2_conversion_factor": 23.999999999999968
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 23999.99999999997,
        "target_conversion_factor": 23999.99999999997,
        "target2_conversion_factor": 23999.99999999997
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 23999.99999999997,
        "target_conversion_factor": 23999.99999999997,
        "target2_conversion_factor": 23999.99999999997
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 23999999.99999997,
        "target_conversion_factor": 23999999.99999997,
        "target2_conversion_factor": 23999999.99999997
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 23999999.99999997,
        "target_conversion_factor": 23999999.99999997,
        "target2_conversion_factor": 23999999.99999997
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 24000000000.00002,
        "target_conversion_factor": 24000000000.00002,
        "target2_conversion_factor": 24000000000.00002
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 48000000.00000004,
        "target_conversion_factor": 960000.0000000008,
        "target2_conversion_factor": 960000.0000000008
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 33333333333.333317,
        "target_conversion_factor": 666666666.6666663,
        "target2_conversion_factor": 666666666.6666663
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 2000000000000,
        "target_conversion_factor": 40000000000,
        "target2_conversion_factor": 40000000000
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 33333333333333.316,
        "target_conversion_factor": 666666666666.6663,
        "target2_conversion_factor": 666666666666.6663
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 48000000000000.04,
        "target_conversion_factor": 960000000000.0009,
        "target2_conversion_factor": 960000000000.0009
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 2000000000000000,
        "target_conversion_factor": 40000000000000,
        "target2_conversion_factor": 40000000000000
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 48000000000000040,
        "target_conversion_factor": 960000000000001,
        "target2_conversion_factor": 960000000000001
      }
    ]
  },
  {
    "id": 24,
    "symbol": "L/day/pmol",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 0.04166666666666672,
        "target_conversion_factor": 0.04166666666666672,
        "target2_conversion_factor": 0.04166666666666672
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 41.66666666666672,
        "target_conversion_factor": 41.66666666666672,
        "target2_conversion_factor": 41.66666666666672
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 41666.666666666635,
        "target_conversion_factor": 41666.666666666635,
        "target2_conversion_factor": 41666.666666666635
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 1388888888.8888872,
        "target_conversion_factor": 27777777.777777743,
        "target2_conversion_factor": 27777777.777777743
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 83333333333.33327,
        "target_conversion_factor": 1666666666.6666653,
        "target2_conversion_factor": 1666666666.6666653
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 1388888888888.887,
        "target_conversion_factor": 27777777777.77774,
        "target2_conversion_factor": 27777777777.77774
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 2000000000000,
        "target_conversion_factor": 40000000000,
        "target2_conversion_factor": 40000000000
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 83333333333333.27,
        "target_conversion_factor": 1666666666666.6653,
        "target2_conversion_factor": 1666666666666.6653
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 2000000000000000,
        "target_conversion_factor": 40000000000000,
        "target2_conversion_factor": 40000000000000
      }
    ]
  },
  {
    "id": 26,
    "symbol": "L/h/nmol",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 0.02399999999999997,
        "target_conversion_factor": 0.02399999999999997,
        "target2_conversion_factor": 0.02399999999999997
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 23.999999999999968,
        "target_conversion_factor": 23.999999999999968,
        "target2_conversion_factor": 23.999999999999968
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 23.999999999999968,
        "target_conversion_factor": 23.999999999999968,
        "target2_conversion_factor": 23.999999999999968
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 999.999999999999,
        "target_conversion_factor": 999.999999999999,
        "target2_conversion_factor": 999.999999999999
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 23999.99999999997,
        "target_conversion_factor": 23999.99999999997,
        "target2_conversion_factor": 23999.99999999997
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 23999.99999999997,
        "target_conversion_factor": 23999.99999999997,
        "target2_conversion_factor": 23999.99999999997
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 23999999.99999997,
        "target_conversion_factor": 23999999.99999997,
        "target2_conversion_factor": 23999999.99999997
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 47999.99999999994,
        "target_conversion_factor": 959.9999999999989,
        "target2_conversion_factor": 959.9999999999989
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 33333333.333333317,
        "target_conversion_factor": 666666.6666666663,
        "target2_conversion_factor": 666666.6666666663
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 33333333333.333317,
        "target_conversion_factor": 666666666.6666663,
        "target2_conversion_factor": 666666666.6666663
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 48000000000.00004,
        "target_conversion_factor": 960000000.0000008,
        "target2_conversion_factor": 960000000.0000008
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 2000000000000,
        "target_conversion_factor": 40000000000,
        "target2_conversion_factor": 40000000000
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 48000000000000.04,
        "target_conversion_factor": 960000000000.0009,
        "target2_conversion_factor": 960000000000.0009
      }
    ]
  },
  {
    "id": 25,
    "symbol": "mL/day/pmol",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 0.00004166666666666672,
        "target_conversion_factor": 0.00004166666666666672,
        "target2_conversion_factor": 0.00004166666666666672
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 0.04166666666666672,
        "target_conversion_factor": 0.04166666666666672,
        "target2_conversion_factor": 0.04166666666666672
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 41.66666666666668,
        "target_conversion_factor": 41.66666666666668,
        "target2_conversion_factor": 41.66666666666668
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 1388888.8888888871,
        "target_conversion_factor": 27777.777777777745,
        "target2_conversion_factor": 27777.777777777745
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 83333333.33333327,
        "target_conversion_factor": 1666666.6666666653,
        "target2_conversion_factor": 1666666.6666666653
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 1388888888.8888872,
        "target_conversion_factor": 27777777.777777743,
        "target2_conversion_factor": 27777777.777777743
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 83333333333.33327,
        "target_conversion_factor": 1666666666.6666653,
        "target2_conversion_factor": 1666666666.6666653
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 2000000000000,
        "target_conversion_factor": 40000000000,
        "target2_conversion_factor": 40000000000
      }
    ]
  },
  {
    "id": 27,
    "symbol": "L/day/nmol",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 0.00004166666666666672,
        "target_conversion_factor": 0.00004166666666666672,
        "target2_conversion_factor": 0.00004166666666666672
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 0.04166666666666672,
        "target_conversion_factor": 0.04166666666666672,
        "target2_conversion_factor": 0.04166666666666672
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 41.66666666666668,
        "target_conversion_factor": 41.66666666666668,
        "target2_conversion_factor": 41.66666666666668
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 1388888.8888888871,
        "target_conversion_factor": 27777.777777777745,
        "target2_conversion_factor": 27777.777777777745
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 83333333.33333327,
        "target_conversion_factor": 1666666.6666666653,
        "target2_conversion_factor": 1666666.6666666653
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 1388888888.8888872,
        "target_conversion_factor": 27777777.777777743,
        "target2_conversion_factor": 27777777.777777743
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 83333333333.33327,
        "target_conversion_factor": 1666666666.6666653,
        "target2_conversion_factor": 1666666666.6666653
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 2000000000000,
        "target_conversion_factor": 40000000000,
        "target2_conversion_factor": 40000000000
      }
    ]
  },
  {
    "id": 29,
    "symbol": "L/h/µmol",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 0.000024000000000000018,
        "target_conversion_factor": 0.000024000000000000018,
        "target2_conversion_factor": 0.000024000000000000018
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 0.001000000000000001,
        "target_conversion_factor": 0.001000000000000001,
        "target2_conversion_factor": 0.001000000000000001
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 0.023999999999999994,
        "target_conversion_factor": 0.023999999999999994,
        "target2_conversion_factor": 0.023999999999999994
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 0.023999999999999994,
        "target_conversion_factor": 0.023999999999999994,
        "target2_conversion_factor": 0.023999999999999994
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 23.999999999999993,
        "target_conversion_factor": 23.999999999999993,
        "target2_conversion_factor": 23.999999999999993
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 23.999999999999993,
        "target_conversion_factor": 23.999999999999993,
        "target2_conversion_factor": 23.999999999999993
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 24000.00000000002,
        "target_conversion_factor": 24000.00000000002,
        "target2_conversion_factor": 24000.00000000002
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 48.000000000000036,
        "target_conversion_factor": 0.9600000000000007,
        "target2_conversion_factor": 0.9600000000000007
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 33333.333333333314,
        "target_conversion_factor": 666.6666666666663,
        "target2_conversion_factor": 666.6666666666663
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 33333333.333333317,
        "target_conversion_factor": 666666.6666666663,
        "target2_conversion_factor": 666666.6666666663
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 48000000.00000004,
        "target_conversion_factor": 960000.0000000008,
        "target2_conversion_factor": 960000.0000000008
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 48000000000.00004,
        "target_conversion_factor": 960000000.0000008,
        "target2_conversion_factor": 960000000.0000008
      }
    ]
  },
  {
    "id": 28,
    "symbol": "mL/day/nmol",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 4.166666666666672e-8,
        "target_conversion_factor": 4.166666666666672e-8,
        "target2_conversion_factor": 4.166666666666672e-8
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 0.00004166666666666672,
        "target_conversion_factor": 0.00004166666666666672,
        "target2_conversion_factor": 0.00004166666666666672
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 0.04166666666666668,
        "target_conversion_factor": 0.04166666666666668,
        "target2_conversion_factor": 0.04166666666666668
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 1388.8888888888898,
        "target_conversion_factor": 27.7777777777778,
        "target2_conversion_factor": 27.7777777777778
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 83333.33333333343,
        "target_conversion_factor": 1666.6666666666686,
        "target2_conversion_factor": 1666.6666666666686
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 1388888.8888888871,
        "target_conversion_factor": 27777.777777777745,
        "target2_conversion_factor": 27777.777777777745
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 83333333.33333327,
        "target_conversion_factor": 1666666.6666666653,
        "target2_conversion_factor": 1666666.6666666653
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      }
    ]
  },
  {
    "id": 30,
    "symbol": "L/day/µmol",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 4.166666666666672e-8,
        "target_conversion_factor": 4.166666666666672e-8,
        "target2_conversion_factor": 4.166666666666672e-8
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 0.00004166666666666672,
        "target_conversion_factor": 0.00004166666666666672,
        "target2_conversion_factor": 0.00004166666666666672
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 0.04166666666666668,
        "target_conversion_factor": 0.04166666666666668,
        "target2_conversion_factor": 0.04166666666666668
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 1388.8888888888898,
        "target_conversion_factor": 27.7777777777778,
        "target2_conversion_factor": 27.7777777777778
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 83333.33333333343,
        "target_conversion_factor": 1666.6666666666686,
        "target2_conversion_factor": 1666.6666666666686
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 1388888.8888888871,
        "target_conversion_factor": 27777.777777777745,
        "target2_conversion_factor": 27777.777777777745
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 83333333.33333327,
        "target_conversion_factor": 1666666.6666666653,
        "target2_conversion_factor": 1666666.6666666653
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      }
    ]
  },
  {
    "id": 31,
    "symbol": "mL/day/µmol",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 4.166666666666663e-11,
        "target_conversion_factor": 4.166666666666663e-11,
        "target2_conversion_factor": 4.166666666666663e-11
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 4.166666666666672e-8,
        "target_conversion_factor": 4.166666666666672e-8,
        "target2_conversion_factor": 4.166666666666672e-8
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 0.00004166666666666663,
        "target_conversion_factor": 0.00004166666666666663,
        "target2_conversion_factor": 0.00004166666666666663
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 1.3888888888888897,
        "target_conversion_factor": 0.027777777777777797,
        "target2_conversion_factor": 0.027777777777777797
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 83.33333333333344,
        "target_conversion_factor": 1.666666666666669,
        "target2_conversion_factor": 1.666666666666669
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 1388.8888888888898,
        "target_conversion_factor": 27.7777777777778,
        "target2_conversion_factor": 27.7777777777778
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 2000.000000000004,
        "target_conversion_factor": 40.000000000000085,
        "target2_conversion_factor": 40.000000000000085
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 83333.33333333343,
        "target_conversion_factor": 1666.6666666666686,
        "target2_conversion_factor": 1666.6666666666686
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      }
    ]
  },
  {
    "id": 2,
    "symbol": "mol",
    "compatible_units": [
      {
        "id": 41,
        "symbol": "kg",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 42,
        "symbol": "g",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 11,
        "symbol": "mg",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 102,
        "symbol": "µg",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 43,
        "symbol": "ng",
        "conversion_factor": 500000000000,
        "target_conversion_factor": 25000000000000,
        "target2_conversion_factor": 25000000000000
      },
      {
        "id": 2,
        "symbol": "mol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 5,
        "symbol": "µmol",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 3,
        "symbol": "nmol",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 4,
        "symbol": "pmol",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      }
    ]
  },
  {
    "id": 5,
    "symbol": "µmol",
    "compatible_units": [
      {
        "id": 41,
        "symbol": "kg",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 42,
        "symbol": "g",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 11,
        "symbol": "mg",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 102,
        "symbol": "µg",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 43,
        "symbol": "ng",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 2,
        "symbol": "mol",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 5,
        "symbol": "µmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 3,
        "symbol": "nmol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 4,
        "symbol": "pmol",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      }
    ]
  },
  {
    "id": 3,
    "symbol": "nmol",
    "compatible_units": [
      {
        "id": 41,
        "symbol": "kg",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 42,
        "symbol": "g",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 11,
        "symbol": "mg",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 102,
        "symbol": "µg",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 43,
        "symbol": "ng",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 2,
        "symbol": "mol",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 5,
        "symbol": "µmol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 3,
        "symbol": "nmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 4,
        "symbol": "pmol",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      }
    ]
  },
  {
    "id": 4,
    "symbol": "pmol",
    "compatible_units": [
      {
        "id": 41,
        "symbol": "kg",
        "conversion_factor": 5e-13,
        "target_conversion_factor": 2.5e-11,
        "target2_conversion_factor": 2.5e-11
      },
      {
        "id": 42,
        "symbol": "g",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 11,
        "symbol": "mg",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 102,
        "symbol": "µg",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 43,
        "symbol": "ng",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 2,
        "symbol": "mol",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 5,
        "symbol": "µmol",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 3,
        "symbol": "nmol",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 4,
        "symbol": "pmol",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 77,
    "symbol": "mol/h",
    "compatible_units": [
      {
        "id": 95,
        "symbol": "g/h",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 93,
        "symbol": "mg/h",
        "conversion_factor": 500000.0000000005,
        "target_conversion_factor": 25000000.000000026,
        "target2_conversion_factor": 25000000.000000026
      },
      {
        "id": 92,
        "symbol": "µg/h",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 94,
        "symbol": "ng/h",
        "conversion_factor": 500000000000,
        "target_conversion_factor": 25000000000000,
        "target2_conversion_factor": 25000000000000
      },
      {
        "id": 91,
        "symbol": "pg/h",
        "conversion_factor": 500000000000000,
        "target_conversion_factor": 25000000000000000,
        "target2_conversion_factor": 25000000000000000
      },
      {
        "id": 77,
        "symbol": "mol/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 80,
        "symbol": "µmol/h",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 78,
        "symbol": "nmol/h",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 75,
        "symbol": "[kat (2.777777777777775e-16)]",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      },
      {
        "id": 79,
        "symbol": "pmol/h",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      }
    ]
  },
  {
    "id": 80,
    "symbol": "µmol/h",
    "compatible_units": [
      {
        "id": 95,
        "symbol": "g/h",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 93,
        "symbol": "mg/h",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 92,
        "symbol": "µg/h",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 94,
        "symbol": "ng/h",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 91,
        "symbol": "pg/h",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 77,
        "symbol": "mol/h",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 80,
        "symbol": "µmol/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 78,
        "symbol": "nmol/h",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 75,
        "symbol": "[kat (2.777777777777775e-16)]",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 79,
        "symbol": "pmol/h",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      }
    ]
  },
  {
    "id": 78,
    "symbol": "nmol/h",
    "compatible_units": [
      {
        "id": 95,
        "symbol": "g/h",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 93,
        "symbol": "mg/h",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 92,
        "symbol": "µg/h",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 94,
        "symbol": "ng/h",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 91,
        "symbol": "pg/h",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 77,
        "symbol": "mol/h",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 80,
        "symbol": "µmol/h",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 78,
        "symbol": "nmol/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 75,
        "symbol": "[kat (2.777777777777775e-16)]",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 79,
        "symbol": "pmol/h",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      }
    ]
  },
  {
    "id": 75,
    "symbol": "[kat (2.777777777777775e-16)]",
    "compatible_units": [
      {
        "id": 95,
        "symbol": "g/h",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 93,
        "symbol": "mg/h",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 92,
        "symbol": "µg/h",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 94,
        "symbol": "ng/h",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 91,
        "symbol": "pg/h",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 77,
        "symbol": "mol/h",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 80,
        "symbol": "µmol/h",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 78,
        "symbol": "nmol/h",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 75,
        "symbol": "[kat (2.777777777777775e-16)]",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 79,
        "symbol": "pmol/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 79,
    "symbol": "pmol/h",
    "compatible_units": [
      {
        "id": 95,
        "symbol": "g/h",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 93,
        "symbol": "mg/h",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 92,
        "symbol": "µg/h",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 94,
        "symbol": "ng/h",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 91,
        "symbol": "pg/h",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 77,
        "symbol": "mol/h",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 80,
        "symbol": "µmol/h",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 78,
        "symbol": "nmol/h",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 75,
        "symbol": "[kat (2.777777777777775e-16)]",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 79,
        "symbol": "pmol/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 14,
    "symbol": "week",
    "compatible_units": [
      {
        "id": 14,
        "symbol": "week",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 12,
        "symbol": "day",
        "conversion_factor": 7.000000000000002,
        "target_conversion_factor": 7.000000000000002,
        "target2_conversion_factor": 7.000000000000002
      },
      {
        "id": 9,
        "symbol": "h",
        "conversion_factor": 168,
        "target_conversion_factor": 168,
        "target2_conversion_factor": 168
      },
      {
        "id": 16,
        "symbol": "min",
        "conversion_factor": 10079.999999999995,
        "target_conversion_factor": 10079.999999999995,
        "target2_conversion_factor": 10079.999999999995
      },
      {
        "id": 17,
        "symbol": "s",
        "conversion_factor": 604800,
        "target_conversion_factor": 604800,
        "target2_conversion_factor": 604800
      }
    ]
  },
  {
    "id": 12,
    "symbol": "day",
    "compatible_units": [
      {
        "id": 14,
        "symbol": "week",
        "conversion_factor": 0.14285714285714282,
        "target_conversion_factor": 0.14285714285714282,
        "target2_conversion_factor": 0.14285714285714282
      },
      {
        "id": 12,
        "symbol": "day",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 9,
        "symbol": "h",
        "conversion_factor": 23.999999999999993,
        "target_conversion_factor": 23.999999999999993,
        "target2_conversion_factor": 23.999999999999993
      },
      {
        "id": 16,
        "symbol": "min",
        "conversion_factor": 1439.9999999999989,
        "target_conversion_factor": 1439.9999999999989,
        "target2_conversion_factor": 1439.9999999999989
      },
      {
        "id": 17,
        "symbol": "s",
        "conversion_factor": 86400,
        "target_conversion_factor": 86400,
        "target2_conversion_factor": 86400
      }
    ]
  },
  {
    "id": 9,
    "symbol": "h",
    "compatible_units": [
      {
        "id": 14,
        "symbol": "week",
        "conversion_factor": 0.005952380952380953,
        "target_conversion_factor": 0.005952380952380953,
        "target2_conversion_factor": 0.005952380952380953
      },
      {
        "id": 12,
        "symbol": "day",
        "conversion_factor": 0.04166666666666668,
        "target_conversion_factor": 0.04166666666666668,
        "target2_conversion_factor": 0.04166666666666668
      },
      {
        "id": 9,
        "symbol": "h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 16,
        "symbol": "min",
        "conversion_factor": 60,
        "target_conversion_factor": 60,
        "target2_conversion_factor": 60
      },
      {
        "id": 17,
        "symbol": "s",
        "conversion_factor": 3600,
        "target_conversion_factor": 3600,
        "target2_conversion_factor": 3600
      }
    ]
  },
  {
    "id": 16,
    "symbol": "min",
    "compatible_units": [
      {
        "id": 14,
        "symbol": "week",
        "conversion_factor": 0.00009920634920634926,
        "target_conversion_factor": 0.00009920634920634926,
        "target2_conversion_factor": 0.00009920634920634926
      },
      {
        "id": 12,
        "symbol": "day",
        "conversion_factor": 0.000694444444444445,
        "target_conversion_factor": 0.000694444444444445,
        "target2_conversion_factor": 0.000694444444444445
      },
      {
        "id": 9,
        "symbol": "h",
        "conversion_factor": 0.016666666666666666,
        "target_conversion_factor": 0.016666666666666666,
        "target2_conversion_factor": 0.016666666666666666
      },
      {
        "id": 16,
        "symbol": "min",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 17,
        "symbol": "s",
        "conversion_factor": 60,
        "target_conversion_factor": 60,
        "target2_conversion_factor": 60
      }
    ]
  },
  {
    "id": 17,
    "symbol": "s",
    "compatible_units": [
      {
        "id": 14,
        "symbol": "week",
        "conversion_factor": 0.0000016534391534391535,
        "target_conversion_factor": 0.0000016534391534391535,
        "target2_conversion_factor": 0.0000016534391534391535
      },
      {
        "id": 12,
        "symbol": "day",
        "conversion_factor": 0.000011574074074074077,
        "target_conversion_factor": 0.000011574074074074077,
        "target2_conversion_factor": 0.000011574074074074077
      },
      {
        "id": 9,
        "symbol": "h",
        "conversion_factor": 0.0002777777777777778,
        "target_conversion_factor": 0.0002777777777777778,
        "target2_conversion_factor": 0.0002777777777777778
      },
      {
        "id": 16,
        "symbol": "min",
        "conversion_factor": 0.016666666666666666,
        "target_conversion_factor": 0.016666666666666666,
        "target2_conversion_factor": 0.016666666666666666
      },
      {
        "id": 17,
        "symbol": "s",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 53,
    "symbol": "",
    "compatible_units": [
      {
        "id": 55,
        "symbol": "g/nmol",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 98,
        "symbol": "kg/mol",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 54,
        "symbol": "g/mol",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 53,
        "symbol": "",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 66,
        "symbol": "mg/kg",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 69,
        "symbol": "µg/kg",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 68,
        "symbol": "ng/kg",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      },
      {
        "id": 67,
        "symbol": "pg/kg",
        "conversion_factor": 1000000000000000,
        "target_conversion_factor": 1000000000000000,
        "target2_conversion_factor": 1000000000000000
      },
      {
        "id": 72,
        "symbol": "µmol/kg",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      },
      {
        "id": 71,
        "symbol": "nmol/kg",
        "conversion_factor": 2000000000,
        "target_conversion_factor": 40000000,
        "target2_conversion_factor": 40000000
      },
      {
        "id": 70,
        "symbol": "pmol/kg",
        "conversion_factor": 2000000000000,
        "target_conversion_factor": 40000000000,
        "target2_conversion_factor": 40000000000
      }
    ]
  },
  {
    "id": 66,
    "symbol": "mg/kg",
    "compatible_units": [
      {
        "id": 55,
        "symbol": "g/nmol",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 98,
        "symbol": "kg/mol",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 54,
        "symbol": "g/mol",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 53,
        "symbol": "",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 66,
        "symbol": "mg/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 69,
        "symbol": "µg/kg",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 68,
        "symbol": "ng/kg",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 67,
        "symbol": "pg/kg",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 72,
        "symbol": "µmol/kg",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 71,
        "symbol": "nmol/kg",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      },
      {
        "id": 70,
        "symbol": "pmol/kg",
        "conversion_factor": 2000000,
        "target_conversion_factor": 40000,
        "target2_conversion_factor": 40000
      }
    ]
  },
  {
    "id": 69,
    "symbol": "µg/kg",
    "compatible_units": [
      {
        "id": 55,
        "symbol": "g/nmol",
        "conversion_factor": 5e-13,
        "target_conversion_factor": 2.5e-11,
        "target2_conversion_factor": 2.5e-11
      },
      {
        "id": 98,
        "symbol": "kg/mol",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 54,
        "symbol": "g/mol",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 53,
        "symbol": "",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 66,
        "symbol": "mg/kg",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 69,
        "symbol": "µg/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 68,
        "symbol": "ng/kg",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 67,
        "symbol": "pg/kg",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 72,
        "symbol": "µmol/kg",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 71,
        "symbol": "nmol/kg",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      },
      {
        "id": 70,
        "symbol": "pmol/kg",
        "conversion_factor": 2000,
        "target_conversion_factor": 40,
        "target2_conversion_factor": 40
      }
    ]
  },
  {
    "id": 68,
    "symbol": "ng/kg",
    "compatible_units": [
      {
        "id": 55,
        "symbol": "g/nmol",
        "conversion_factor": 5e-16,
        "target_conversion_factor": 2.5e-14,
        "target2_conversion_factor": 2.5e-14
      },
      {
        "id": 98,
        "symbol": "kg/mol",
        "conversion_factor": 5e-13,
        "target_conversion_factor": 2.5e-11,
        "target2_conversion_factor": 2.5e-11
      },
      {
        "id": 54,
        "symbol": "g/mol",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 53,
        "symbol": "",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 66,
        "symbol": "mg/kg",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 69,
        "symbol": "µg/kg",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 68,
        "symbol": "ng/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 67,
        "symbol": "pg/kg",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 72,
        "symbol": "µmol/kg",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 71,
        "symbol": "nmol/kg",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      },
      {
        "id": 70,
        "symbol": "pmol/kg",
        "conversion_factor": 2,
        "target_conversion_factor": 0.04,
        "target2_conversion_factor": 0.04
      }
    ]
  },
  {
    "id": 67,
    "symbol": "pg/kg",
    "compatible_units": [
      {
        "id": 55,
        "symbol": "g/nmol",
        "conversion_factor": 4.999999999999999e-19,
        "target_conversion_factor": 2.4999999999999996e-17,
        "target2_conversion_factor": 2.4999999999999996e-17
      },
      {
        "id": 98,
        "symbol": "kg/mol",
        "conversion_factor": 5e-16,
        "target_conversion_factor": 2.5e-14,
        "target2_conversion_factor": 2.5e-14
      },
      {
        "id": 54,
        "symbol": "g/mol",
        "conversion_factor": 5e-13,
        "target_conversion_factor": 2.5e-11,
        "target2_conversion_factor": 2.5e-11
      },
      {
        "id": 53,
        "symbol": "",
        "conversion_factor": 1e-15,
        "target_conversion_factor": 1e-15,
        "target2_conversion_factor": 1e-15
      },
      {
        "id": 66,
        "symbol": "mg/kg",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 69,
        "symbol": "µg/kg",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 68,
        "symbol": "ng/kg",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 67,
        "symbol": "pg/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 72,
        "symbol": "µmol/kg",
        "conversion_factor": 1.9999999999999997e-9,
        "target_conversion_factor": 4e-11,
        "target2_conversion_factor": 4e-11
      },
      {
        "id": 71,
        "symbol": "nmol/kg",
        "conversion_factor": 0.000002,
        "target_conversion_factor": 4e-8,
        "target2_conversion_factor": 4e-8
      },
      {
        "id": 70,
        "symbol": "pmol/kg",
        "conversion_factor": 0.002,
        "target_conversion_factor": 0.00004,
        "target2_conversion_factor": 0.00004
      }
    ]
  },
  {
    "id": 10,
    "symbol": "1/h",
    "compatible_units": [
      {
        "id": 10,
        "symbol": "1/h",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 13,
        "symbol": "1/day",
        "conversion_factor": 23.999999999999993,
        "target_conversion_factor": 23.999999999999993,
        "target2_conversion_factor": 23.999999999999993
      },
      {
        "id": 15,
        "symbol": "1/week",
        "conversion_factor": 168,
        "target_conversion_factor": 168,
        "target2_conversion_factor": 168
      }
    ]
  },
  {
    "id": 13,
    "symbol": "1/day",
    "compatible_units": [
      {
        "id": 10,
        "symbol": "1/h",
        "conversion_factor": 0.04166666666666668,
        "target_conversion_factor": 0.04166666666666668,
        "target2_conversion_factor": 0.04166666666666668
      },
      {
        "id": 13,
        "symbol": "1/day",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 15,
        "symbol": "1/week",
        "conversion_factor": 7.000000000000002,
        "target_conversion_factor": 7.000000000000002,
        "target2_conversion_factor": 7.000000000000002
      }
    ]
  },
  {
    "id": 15,
    "symbol": "1/week",
    "compatible_units": [
      {
        "id": 10,
        "symbol": "1/h",
        "conversion_factor": 0.005952380952380953,
        "target_conversion_factor": 0.005952380952380953,
        "target2_conversion_factor": 0.005952380952380953
      },
      {
        "id": 13,
        "symbol": "1/day",
        "conversion_factor": 0.14285714285714282,
        "target_conversion_factor": 0.14285714285714282,
        "target2_conversion_factor": 0.14285714285714282
      },
      {
        "id": 15,
        "symbol": "1/week",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 63,
    "symbol": "day*µmol/L",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 0.011999999999999985,
        "target_conversion_factor": 0.5999999999999992,
        "target2_conversion_factor": 0.5999999999999992
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 11.999999999999996,
        "target_conversion_factor": 600,
        "target2_conversion_factor": 600
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 11999.999999999984,
        "target_conversion_factor": 599999.9999999992,
        "target2_conversion_factor": 599999.9999999992
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 23.999999999999993,
        "target_conversion_factor": 23.999999999999993,
        "target2_conversion_factor": 23.999999999999993
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 23999.99999999997,
        "target_conversion_factor": 23999.99999999997,
        "target2_conversion_factor": 23999.99999999997
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 23999999.99999997,
        "target_conversion_factor": 23999999.99999997,
        "target2_conversion_factor": 23999999.99999997
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 86400000000.00015,
        "target_conversion_factor": 86400000000.00015,
        "target2_conversion_factor": 86400000000.00015
      }
    ]
  },
  {
    "id": 58,
    "symbol": "h*µmol/L",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 0.00002083333333333332,
        "target_conversion_factor": 0.001041666666666666,
        "target2_conversion_factor": 0.001041666666666666
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 0.020833333333333315,
        "target_conversion_factor": 1.0416666666666659,
        "target2_conversion_factor": 1.0416666666666659
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 20.83333333333334,
        "target_conversion_factor": 1041.666666666667,
        "target2_conversion_factor": 1041.666666666667
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 499.9999999999995,
        "target_conversion_factor": 24999.999999999975,
        "target2_conversion_factor": 24999.999999999975
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 0.04166666666666668,
        "target_conversion_factor": 0.04166666666666668,
        "target2_conversion_factor": 0.04166666666666668
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 41.66666666666668,
        "target_conversion_factor": 41.66666666666668,
        "target2_conversion_factor": 41.66666666666668
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 999.999999999999,
        "target_conversion_factor": 999.999999999999,
        "target2_conversion_factor": 999.999999999999
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 41666.666666666635,
        "target_conversion_factor": 41666.666666666635,
        "target2_conversion_factor": 41666.666666666635
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 3600000000.000004,
        "target_conversion_factor": 3600000000.000004,
        "target2_conversion_factor": 3600000000.000004
      }
    ]
  },
  {
    "id": 62,
    "symbol": "day*nmol/L",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 0.000011999999999999985,
        "target_conversion_factor": 0.0005999999999999993,
        "target2_conversion_factor": 0.0005999999999999993
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 0.012000000000000009,
        "target_conversion_factor": 0.6000000000000004,
        "target2_conversion_factor": 0.6000000000000004
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 11.999999999999984,
        "target_conversion_factor": 599.9999999999992,
        "target2_conversion_factor": 599.9999999999992
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 0.023999999999999994,
        "target_conversion_factor": 0.023999999999999994,
        "target2_conversion_factor": 0.023999999999999994
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 23.999999999999968,
        "target_conversion_factor": 23.999999999999968,
        "target2_conversion_factor": 23.999999999999968
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 23999.99999999997,
        "target_conversion_factor": 23999.99999999997,
        "target2_conversion_factor": 23999.99999999997
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 86400000,
        "target_conversion_factor": 86400000,
        "target2_conversion_factor": 86400000
      }
    ]
  },
  {
    "id": 57,
    "symbol": "h*nmol/L",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 2.0833333333333315e-8,
        "target_conversion_factor": 0.0000010416666666666659,
        "target2_conversion_factor": 0.0000010416666666666659
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 0.00002083333333333336,
        "target_conversion_factor": 0.001041666666666668,
        "target2_conversion_factor": 0.001041666666666668
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 0.02083333333333336,
        "target_conversion_factor": 1.041666666666668,
        "target2_conversion_factor": 1.041666666666668
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 0.00004166666666666672,
        "target_conversion_factor": 0.00004166666666666672,
        "target2_conversion_factor": 0.00004166666666666672
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 0.001000000000000001,
        "target_conversion_factor": 0.001000000000000001,
        "target2_conversion_factor": 0.001000000000000001
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 0.04166666666666672,
        "target_conversion_factor": 0.04166666666666672,
        "target2_conversion_factor": 0.04166666666666672
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 41.66666666666672,
        "target_conversion_factor": 41.66666666666672,
        "target2_conversion_factor": 41.66666666666672
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 3600000.0000000037,
        "target_conversion_factor": 3600000.0000000037,
        "target2_conversion_factor": 3600000.0000000037
      }
    ]
  },
  {
    "id": 61,
    "symbol": "day*pmol/L",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 1.2000000000000008e-8,
        "target_conversion_factor": 6.000000000000004e-7,
        "target2_conversion_factor": 6.000000000000004e-7
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 0.00001200000000000001,
        "target_conversion_factor": 0.0006000000000000005,
        "target2_conversion_factor": 0.0006000000000000005
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 0.011999999999999985,
        "target_conversion_factor": 0.5999999999999992,
        "target2_conversion_factor": 0.5999999999999992
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 0.000024000000000000018,
        "target_conversion_factor": 0.000024000000000000018,
        "target2_conversion_factor": 0.000024000000000000018
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 0.02399999999999997,
        "target_conversion_factor": 0.02399999999999997,
        "target2_conversion_factor": 0.02399999999999997
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 23.999999999999968,
        "target_conversion_factor": 23.999999999999968,
        "target2_conversion_factor": 23.999999999999968
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 86400,
        "target_conversion_factor": 86400,
        "target2_conversion_factor": 86400
      }
    ]
  },
  {
    "id": 56,
    "symbol": "h*pmol/L",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 2.083333333333332e-11,
        "target_conversion_factor": 1.0416666666666659e-9,
        "target2_conversion_factor": 1.0416666666666659e-9
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 2.0833333333333315e-8,
        "target_conversion_factor": 0.0000010416666666666659,
        "target2_conversion_factor": 0.0000010416666666666659
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 0.00002083333333333336,
        "target_conversion_factor": 0.001041666666666668,
        "target2_conversion_factor": 0.001041666666666668
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 4.166666666666672e-8,
        "target_conversion_factor": 4.166666666666672e-8,
        "target2_conversion_factor": 4.166666666666672e-8
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 0.00004166666666666672,
        "target_conversion_factor": 0.00004166666666666672,
        "target2_conversion_factor": 0.00004166666666666672
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 0.04166666666666672,
        "target_conversion_factor": 0.04166666666666672,
        "target2_conversion_factor": 0.04166666666666672
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 3600.0000000000036,
        "target_conversion_factor": 3600.0000000000036,
        "target2_conversion_factor": 3600.0000000000036
      }
    ]
  },
  {
    "id": 74,
    "symbol": "[s*mol/m^3 (1e-09)]",
    "compatible_units": [
      {
        "id": 100,
        "symbol": "day*mg/mL",
        "conversion_factor": 5.787037037037026e-15,
        "target_conversion_factor": 2.893518518518513e-13,
        "target2_conversion_factor": 2.893518518518513e-13
      },
      {
        "id": 99,
        "symbol": "h*mg/mL",
        "conversion_factor": 1.3888888888888875e-13,
        "target_conversion_factor": 6.944444444444438e-12,
        "target2_conversion_factor": 6.944444444444438e-12
      },
      {
        "id": 65,
        "symbol": "day*µg/mL",
        "conversion_factor": 5.787037037037026e-12,
        "target_conversion_factor": 2.8935185185185133e-10,
        "target2_conversion_factor": 2.8935185185185133e-10
      },
      {
        "id": 60,
        "symbol": "h*µg/mL",
        "conversion_factor": 1.3888888888888875e-10,
        "target_conversion_factor": 6.944444444444438e-9,
        "target2_conversion_factor": 6.944444444444438e-9
      },
      {
        "id": 64,
        "symbol": "day*ng/mL",
        "conversion_factor": 5.787037037037026e-9,
        "target_conversion_factor": 2.893518518518513e-7,
        "target2_conversion_factor": 2.893518518518513e-7
      },
      {
        "id": 59,
        "symbol": "h*ng/mL",
        "conversion_factor": 1.3888888888888875e-7,
        "target_conversion_factor": 0.000006944444444444438,
        "target2_conversion_factor": 0.000006944444444444438
      },
      {
        "id": 63,
        "symbol": "day*µmol/L",
        "conversion_factor": 1.1574074074074053e-11,
        "target_conversion_factor": 1.1574074074074053e-11,
        "target2_conversion_factor": 1.1574074074074053e-11
      },
      {
        "id": 58,
        "symbol": "h*µmol/L",
        "conversion_factor": 2.777777777777775e-10,
        "target_conversion_factor": 2.777777777777775e-10,
        "target2_conversion_factor": 2.777777777777775e-10
      },
      {
        "id": 62,
        "symbol": "day*nmol/L",
        "conversion_factor": 1.1574074074074077e-8,
        "target_conversion_factor": 1.1574074074074077e-8,
        "target2_conversion_factor": 1.1574074074074077e-8
      },
      {
        "id": 57,
        "symbol": "h*nmol/L",
        "conversion_factor": 2.777777777777775e-7,
        "target_conversion_factor": 2.777777777777775e-7,
        "target2_conversion_factor": 2.777777777777775e-7
      },
      {
        "id": 61,
        "symbol": "day*pmol/L",
        "conversion_factor": 0.000011574074074074077,
        "target_conversion_factor": 0.000011574074074074077,
        "target2_conversion_factor": 0.000011574074074074077
      },
      {
        "id": 56,
        "symbol": "h*pmol/L",
        "conversion_factor": 0.0002777777777777775,
        "target_conversion_factor": 0.0002777777777777775,
        "target2_conversion_factor": 0.0002777777777777775
      },
      {
        "id": 74,
        "symbol": "[s*mol/m^3 (1e-09)]",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 87,
    "symbol": "mol/mL",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 50000,
        "target_conversion_factor": 2500000,
        "target2_conversion_factor": 2500000
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 500000000000,
        "target_conversion_factor": 25000000000000,
        "target2_conversion_factor": 25000000000000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 500000000000,
        "target_conversion_factor": 25000000000000,
        "target2_conversion_factor": 25000000000000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 500000000000000,
        "target_conversion_factor": 25000000000000000,
        "target2_conversion_factor": 25000000000000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 500000000000000,
        "target_conversion_factor": 25000000000000000,
        "target2_conversion_factor": 25000000000000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 500000000000000000,
        "target_conversion_factor": 25000000000000000000,
        "target2_conversion_factor": 25000000000000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 1000000000000000,
        "target_conversion_factor": 1000000000000000,
        "target2_conversion_factor": 1000000000000000
      }
    ]
  },
  {
    "id": 82,
    "symbol": "mol/L",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 50,
        "target_conversion_factor": 2500,
        "target2_conversion_factor": 2500
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 500000000000,
        "target_conversion_factor": 25000000000000,
        "target2_conversion_factor": 25000000000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 500000000000,
        "target_conversion_factor": 25000000000000,
        "target2_conversion_factor": 25000000000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 500000000000000,
        "target_conversion_factor": 25000000000000000,
        "target2_conversion_factor": 25000000000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      }
    ]
  },
  {
    "id": 86,
    "symbol": "mmol/mL",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 50,
        "target_conversion_factor": 2500,
        "target2_conversion_factor": 2500
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 500000000000,
        "target_conversion_factor": 25000000000000,
        "target2_conversion_factor": 25000000000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 500000000000,
        "target_conversion_factor": 25000000000000,
        "target2_conversion_factor": 25000000000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 500000000000000,
        "target_conversion_factor": 25000000000000000,
        "target2_conversion_factor": 25000000000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 1000000000000,
        "target_conversion_factor": 1000000000000,
        "target2_conversion_factor": 1000000000000
      }
    ]
  },
  {
    "id": 81,
    "symbol": "mmol/L",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 0.05,
        "target_conversion_factor": 2.5,
        "target2_conversion_factor": 2.5
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 500000000000,
        "target_conversion_factor": 25000000000000,
        "target2_conversion_factor": 25000000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      }
    ]
  },
  {
    "id": 85,
    "symbol": "µmol/mL",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 0.05,
        "target_conversion_factor": 2.5,
        "target2_conversion_factor": 2.5
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 500000000000,
        "target_conversion_factor": 25000000000000,
        "target2_conversion_factor": 25000000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      }
    ]
  },
  {
    "id": 7,
    "symbol": "µmol/L",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 0.000049999999999999996,
        "target_conversion_factor": 0.0025,
        "target2_conversion_factor": 0.0025
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      }
    ]
  },
  {
    "id": 84,
    "symbol": "nmol/mL",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 0.000049999999999999996,
        "target_conversion_factor": 0.0025,
        "target2_conversion_factor": 0.0025
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      }
    ]
  },
  {
    "id": 1,
    "symbol": "nmol/L",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 5.0000000000000004e-8,
        "target_conversion_factor": 0.0000025,
        "target2_conversion_factor": 0.0000025
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      }
    ]
  },
  {
    "id": 83,
    "symbol": "pmol/mL",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 5.0000000000000004e-8,
        "target_conversion_factor": 0.0000025,
        "target2_conversion_factor": 0.0000025
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      }
    ]
  },
  {
    "id": 6,
    "symbol": "pmol/L",
    "compatible_units": [
      {
        "id": 97,
        "symbol": "g/mL",
        "conversion_factor": 5e-13,
        "target_conversion_factor": 2.5e-11,
        "target2_conversion_factor": 2.5e-11
      },
      {
        "id": 52,
        "symbol": "g/dL",
        "conversion_factor": 5e-11,
        "target_conversion_factor": 2.5e-9,
        "target2_conversion_factor": 2.5e-9
      },
      {
        "id": 47,
        "symbol": "g/L",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 96,
        "symbol": "mg/mL",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 45,
        "symbol": "mg/L",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 49,
        "symbol": "µg/mL",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 44,
        "symbol": "ng/mL",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 90,
        "symbol": "µg/L",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 46,
        "symbol": "ng/L",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 48,
        "symbol": "pg/mL",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 89,
        "symbol": "pg/L",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 87,
        "symbol": "mol/mL",
        "conversion_factor": 1e-15,
        "target_conversion_factor": 1e-15,
        "target2_conversion_factor": 1e-15
      },
      {
        "id": 82,
        "symbol": "mol/L",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 86,
        "symbol": "mmol/mL",
        "conversion_factor": 1e-12,
        "target_conversion_factor": 1e-12,
        "target2_conversion_factor": 1e-12
      },
      {
        "id": 81,
        "symbol": "mmol/L",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 85,
        "symbol": "µmol/mL",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 7,
        "symbol": "µmol/L",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 84,
        "symbol": "nmol/mL",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 1,
        "symbol": "nmol/L",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 83,
        "symbol": "pmol/mL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 6,
        "symbol": "pmol/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 50,
    "symbol": "10^6/mcL",
    "compatible_units": [
      {
        "id": 50,
        "symbol": "10^6/mcL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 51,
        "symbol": "10^3/mcL",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 40,
        "symbol": "1/L",
        "conversion_factor": 100000000000,
        "target_conversion_factor": 100000000000,
        "target2_conversion_factor": 100000000000
      }
    ]
  },
  {
    "id": 51,
    "symbol": "10^3/mcL",
    "compatible_units": [
      {
        "id": 50,
        "symbol": "10^6/mcL",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 51,
        "symbol": "10^3/mcL",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 40,
        "symbol": "1/L",
        "conversion_factor": 100000000,
        "target_conversion_factor": 100000000,
        "target2_conversion_factor": 100000000
      }
    ]
  },
  {
    "id": 40,
    "symbol": "1/L",
    "compatible_units": [
      {
        "id": 50,
        "symbol": "10^6/mcL",
        "conversion_factor": 1e-11,
        "target_conversion_factor": 1e-11,
        "target2_conversion_factor": 1e-11
      },
      {
        "id": 51,
        "symbol": "10^3/mcL",
        "conversion_factor": 1e-8,
        "target_conversion_factor": 1e-8,
        "target2_conversion_factor": 1e-8
      },
      {
        "id": 40,
        "symbol": "1/L",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 76,
    "symbol": "[mM^2 (1e-18)]",
    "compatible_units": [
      {
        "id": 76,
        "symbol": "[mM^2 (1e-18)]",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 34,
    "symbol": "L/kg",
    "compatible_units": [
      {
        "id": 34,
        "symbol": "L/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 73,
        "symbol": "mL/kg",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      }
    ]
  },
  {
    "id": 73,
    "symbol": "mL/kg",
    "compatible_units": [
      {
        "id": 34,
        "symbol": "L/kg",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 73,
        "symbol": "mL/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 18,
    "symbol": "L/mg/day",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 2.0833333333333315e-8,
        "target_conversion_factor": 0.0000010416666666666659,
        "target2_conversion_factor": 0.0000010416666666666659
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 0.00002083333333333336,
        "target_conversion_factor": 0.001041666666666668,
        "target2_conversion_factor": 0.001041666666666668
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 0.020833333333333315,
        "target_conversion_factor": 1.0416666666666659,
        "target2_conversion_factor": 1.0416666666666659
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 694.4444444444449,
        "target_conversion_factor": 694.4444444444449,
        "target2_conversion_factor": 694.4444444444449
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 41666.66666666672,
        "target_conversion_factor": 41666.66666666672,
        "target2_conversion_factor": 41666.66666666672
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 694444.444444445,
        "target_conversion_factor": 694444.444444445,
        "target2_conversion_factor": 694444.444444445
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 1000000.0000000021,
        "target_conversion_factor": 1000000.0000000021,
        "target2_conversion_factor": 1000000.0000000021
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 41666666.66666672,
        "target_conversion_factor": 41666666.66666672,
        "target2_conversion_factor": 41666666.66666672
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 1000000000,
        "target_conversion_factor": 1000000000,
        "target2_conversion_factor": 1000000000
      }
    ]
  },
  {
    "id": 8,
    "symbol": "µL/min/mg",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 3.000000000000002e-11,
        "target_conversion_factor": 1.5000000000000008e-9,
        "target2_conversion_factor": 1.5000000000000008e-9
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 7.200000000000009e-10,
        "target_conversion_factor": 3.600000000000005e-8,
        "target2_conversion_factor": 3.600000000000005e-8
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 3.000000000000001e-8,
        "target_conversion_factor": 0.0000015000000000000007,
        "target2_conversion_factor": 0.0000015000000000000007
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 7.200000000000009e-7,
        "target_conversion_factor": 0.00003600000000000005,
        "target2_conversion_factor": 0.00003600000000000005
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 7.200000000000009e-7,
        "target_conversion_factor": 0.00003600000000000005,
        "target2_conversion_factor": 0.00003600000000000005
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 0.000030000000000000018,
        "target_conversion_factor": 0.001500000000000001,
        "target2_conversion_factor": 0.001500000000000001
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 0.0007199999999999995,
        "target_conversion_factor": 0.03599999999999997,
        "target2_conversion_factor": 0.03599999999999997
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 0.0007199999999999995,
        "target_conversion_factor": 0.03599999999999997,
        "target2_conversion_factor": 0.03599999999999997
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 0.7199999999999995,
        "target_conversion_factor": 35.99999999999998,
        "target2_conversion_factor": 35.99999999999998
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 0.001439999999999999,
        "target_conversion_factor": 0.001439999999999999,
        "target2_conversion_factor": 0.001439999999999999
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 60.00000000000003,
        "target_conversion_factor": 60.00000000000003,
        "target2_conversion_factor": 60.00000000000003
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 1440.0000000000018,
        "target_conversion_factor": 1440.0000000000018,
        "target2_conversion_factor": 1440.0000000000018
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 60000.00000000003,
        "target_conversion_factor": 60000.00000000003,
        "target2_conversion_factor": 60000.00000000003
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 1440000.0000000019,
        "target_conversion_factor": 1440000.0000000019,
        "target2_conversion_factor": 1440000.0000000019
      }
    ]
  },
  {
    "id": 19,
    "symbol": "L/h/kg",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 5e-13,
        "target_conversion_factor": 2.5e-11,
        "target2_conversion_factor": 2.5e-11
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 1.2000000000000009e-11,
        "target_conversion_factor": 6.000000000000004e-10,
        "target2_conversion_factor": 6.000000000000004e-10
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 1.2000000000000008e-8,
        "target_conversion_factor": 6.000000000000004e-7,
        "target2_conversion_factor": 6.000000000000004e-7
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 1.2000000000000008e-8,
        "target_conversion_factor": 6.000000000000004e-7,
        "target2_conversion_factor": 6.000000000000004e-7
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 0.000011999999999999985,
        "target_conversion_factor": 0.0005999999999999993,
        "target2_conversion_factor": 0.0005999999999999993
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 0.000011999999999999985,
        "target_conversion_factor": 0.0005999999999999993,
        "target2_conversion_factor": 0.0005999999999999993
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 0.011999999999999985,
        "target_conversion_factor": 0.5999999999999992,
        "target2_conversion_factor": 0.5999999999999992
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 0.00002399999999999997,
        "target_conversion_factor": 0.00002399999999999997,
        "target2_conversion_factor": 0.00002399999999999997
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 0.01666666666666666,
        "target_conversion_factor": 0.01666666666666666,
        "target2_conversion_factor": 0.01666666666666666
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 16.666666666666657,
        "target_conversion_factor": 16.666666666666657,
        "target2_conversion_factor": 16.666666666666657
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 24.000000000000018,
        "target_conversion_factor": 24.000000000000018,
        "target2_conversion_factor": 24.000000000000018
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 24000.00000000002,
        "target_conversion_factor": 24000.00000000002,
        "target2_conversion_factor": 24000.00000000002
      }
    ]
  },
  {
    "id": 88,
    "symbol": "mL/min/kg",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 3.000000000000001e-14,
        "target_conversion_factor": 1.5000000000000007e-12,
        "target2_conversion_factor": 1.5000000000000007e-12
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 7.20000000000001e-13,
        "target_conversion_factor": 3.600000000000005e-11,
        "target2_conversion_factor": 3.600000000000005e-11
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 3.000000000000002e-11,
        "target_conversion_factor": 1.5000000000000008e-9,
        "target2_conversion_factor": 1.5000000000000008e-9
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 7.200000000000009e-10,
        "target_conversion_factor": 3.600000000000005e-8,
        "target2_conversion_factor": 3.600000000000005e-8
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 7.200000000000009e-10,
        "target_conversion_factor": 3.600000000000005e-8,
        "target2_conversion_factor": 3.600000000000005e-8
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 3.000000000000001e-8,
        "target_conversion_factor": 0.0000015000000000000007,
        "target2_conversion_factor": 0.0000015000000000000007
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 7.200000000000009e-7,
        "target_conversion_factor": 0.00003600000000000005,
        "target2_conversion_factor": 0.00003600000000000005
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 7.200000000000009e-7,
        "target_conversion_factor": 0.00003600000000000005,
        "target2_conversion_factor": 0.00003600000000000005
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 0.0007199999999999995,
        "target_conversion_factor": 0.03599999999999997,
        "target2_conversion_factor": 0.03599999999999997
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 0.000001439999999999999,
        "target_conversion_factor": 0.000001439999999999999,
        "target2_conversion_factor": 0.000001439999999999999
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 0.06000000000000003,
        "target_conversion_factor": 0.06000000000000003,
        "target2_conversion_factor": 0.06000000000000003
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 1.440000000000002,
        "target_conversion_factor": 1.440000000000002,
        "target2_conversion_factor": 1.440000000000002
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 60.00000000000003,
        "target_conversion_factor": 60.00000000000003,
        "target2_conversion_factor": 60.00000000000003
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 1440.0000000000018,
        "target_conversion_factor": 1440.0000000000018,
        "target2_conversion_factor": 1440.0000000000018
      }
    ]
  },
  {
    "id": 21,
    "symbol": "L/day/kg",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 2.0833333333333315e-14,
        "target_conversion_factor": 1.0416666666666659e-12,
        "target2_conversion_factor": 1.0416666666666659e-12
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 5e-13,
        "target_conversion_factor": 2.5e-11,
        "target2_conversion_factor": 2.5e-11
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 2.083333333333332e-11,
        "target_conversion_factor": 1.0416666666666659e-9,
        "target2_conversion_factor": 1.0416666666666659e-9
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 2.0833333333333315e-8,
        "target_conversion_factor": 0.0000010416666666666659,
        "target2_conversion_factor": 0.0000010416666666666659
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 0.000499999999999999,
        "target_conversion_factor": 0.024999999999999953,
        "target2_conversion_factor": 0.024999999999999953
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 9.99999999999998e-7,
        "target_conversion_factor": 9.99999999999998e-7,
        "target2_conversion_factor": 9.99999999999998e-7
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 0.0006944444444444435,
        "target_conversion_factor": 0.0006944444444444435,
        "target2_conversion_factor": 0.0006944444444444435
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 0.04166666666666664,
        "target_conversion_factor": 0.04166666666666664,
        "target2_conversion_factor": 0.04166666666666664
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 0.6944444444444435,
        "target_conversion_factor": 0.6944444444444435,
        "target2_conversion_factor": 0.6944444444444435
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 41.666666666666636,
        "target_conversion_factor": 41.666666666666636,
        "target2_conversion_factor": 41.666666666666636
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      }
    ]
  },
  {
    "id": 20,
    "symbol": "mL/h/kg",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 5e-16,
        "target_conversion_factor": 2.5e-14,
        "target2_conversion_factor": 2.5e-14
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 1.200000000000001e-14,
        "target_conversion_factor": 6.000000000000005e-13,
        "target2_conversion_factor": 6.000000000000005e-13
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 5e-13,
        "target_conversion_factor": 2.5e-11,
        "target2_conversion_factor": 2.5e-11
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 1.2000000000000009e-11,
        "target_conversion_factor": 6.000000000000004e-10,
        "target2_conversion_factor": 6.000000000000004e-10
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 1.2000000000000009e-11,
        "target_conversion_factor": 6.000000000000004e-10,
        "target2_conversion_factor": 6.000000000000004e-10
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 1.2000000000000008e-8,
        "target_conversion_factor": 6.000000000000004e-7,
        "target2_conversion_factor": 6.000000000000004e-7
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 1.2000000000000008e-8,
        "target_conversion_factor": 6.000000000000004e-7,
        "target2_conversion_factor": 6.000000000000004e-7
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 0.000011999999999999985,
        "target_conversion_factor": 0.0005999999999999993,
        "target2_conversion_factor": 0.0005999999999999993
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 2.399999999999997e-8,
        "target_conversion_factor": 2.399999999999997e-8,
        "target2_conversion_factor": 2.399999999999997e-8
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 0.000016666666666666657,
        "target_conversion_factor": 0.000016666666666666657,
        "target2_conversion_factor": 0.000016666666666666657
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 0.01666666666666666,
        "target_conversion_factor": 0.01666666666666666,
        "target2_conversion_factor": 0.01666666666666666
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 0.024000000000000018,
        "target_conversion_factor": 0.024000000000000018,
        "target2_conversion_factor": 0.024000000000000018
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 24.000000000000018,
        "target_conversion_factor": 24.000000000000018,
        "target2_conversion_factor": 24.000000000000018
      }
    ]
  },
  {
    "id": 22,
    "symbol": "mL/day/kg",
    "compatible_units": [
      {
        "id": 23,
        "symbol": "L/h/pmol",
        "conversion_factor": 2.0833333333333316e-17,
        "target_conversion_factor": 1.0416666666666657e-15,
        "target2_conversion_factor": 1.0416666666666657e-15
      },
      {
        "id": 24,
        "symbol": "L/day/pmol",
        "conversion_factor": 5e-16,
        "target_conversion_factor": 2.5e-14,
        "target2_conversion_factor": 2.5e-14
      },
      {
        "id": 26,
        "symbol": "L/h/nmol",
        "conversion_factor": 2.0833333333333315e-14,
        "target_conversion_factor": 1.0416666666666659e-12,
        "target2_conversion_factor": 1.0416666666666659e-12
      },
      {
        "id": 25,
        "symbol": "mL/day/pmol",
        "conversion_factor": 5e-13,
        "target_conversion_factor": 2.5e-11,
        "target2_conversion_factor": 2.5e-11
      },
      {
        "id": 27,
        "symbol": "L/day/nmol",
        "conversion_factor": 5e-13,
        "target_conversion_factor": 2.5e-11,
        "target2_conversion_factor": 2.5e-11
      },
      {
        "id": 29,
        "symbol": "L/h/µmol",
        "conversion_factor": 2.083333333333332e-11,
        "target_conversion_factor": 1.0416666666666659e-9,
        "target2_conversion_factor": 1.0416666666666659e-9
      },
      {
        "id": 28,
        "symbol": "mL/day/nmol",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 30,
        "symbol": "L/day/µmol",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 31,
        "symbol": "mL/day/µmol",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 18,
        "symbol": "L/mg/day",
        "conversion_factor": 1e-9,
        "target_conversion_factor": 1e-9,
        "target2_conversion_factor": 1e-9
      },
      {
        "id": 8,
        "symbol": "µL/min/mg",
        "conversion_factor": 6.944444444444435e-7,
        "target_conversion_factor": 6.944444444444435e-7,
        "target2_conversion_factor": 6.944444444444435e-7
      },
      {
        "id": 19,
        "symbol": "L/h/kg",
        "conversion_factor": 0.00004166666666666663,
        "target_conversion_factor": 0.00004166666666666663,
        "target2_conversion_factor": 0.00004166666666666663
      },
      {
        "id": 88,
        "symbol": "mL/min/kg",
        "conversion_factor": 0.0006944444444444435,
        "target_conversion_factor": 0.0006944444444444435,
        "target2_conversion_factor": 0.0006944444444444435
      },
      {
        "id": 21,
        "symbol": "L/day/kg",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 20,
        "symbol": "mL/h/kg",
        "conversion_factor": 0.04166666666666664,
        "target_conversion_factor": 0.04166666666666664,
        "target2_conversion_factor": 0.04166666666666664
      },
      {
        "id": 22,
        "symbol": "mL/day/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  },
  {
    "id": 72,
    "symbol": "µmol/kg",
    "compatible_units": [
      {
        "id": 53,
        "symbol": "",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 66,
        "symbol": "mg/kg",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 69,
        "symbol": "µg/kg",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 68,
        "symbol": "ng/kg",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 67,
        "symbol": "pg/kg",
        "conversion_factor": 500000000,
        "target_conversion_factor": 25000000000,
        "target2_conversion_factor": 25000000000
      },
      {
        "id": 72,
        "symbol": "µmol/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 71,
        "symbol": "nmol/kg",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      },
      {
        "id": 70,
        "symbol": "pmol/kg",
        "conversion_factor": 1000000,
        "target_conversion_factor": 1000000,
        "target2_conversion_factor": 1000000
      }
    ]
  },
  {
    "id": 71,
    "symbol": "nmol/kg",
    "compatible_units": [
      {
        "id": 53,
        "symbol": "",
        "conversion_factor": 5e-10,
        "target_conversion_factor": 2.5e-8,
        "target2_conversion_factor": 2.5e-8
      },
      {
        "id": 66,
        "symbol": "mg/kg",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 69,
        "symbol": "µg/kg",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 68,
        "symbol": "ng/kg",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 67,
        "symbol": "pg/kg",
        "conversion_factor": 500000,
        "target_conversion_factor": 25000000,
        "target2_conversion_factor": 25000000
      },
      {
        "id": 72,
        "symbol": "µmol/kg",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 71,
        "symbol": "nmol/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      },
      {
        "id": 70,
        "symbol": "pmol/kg",
        "conversion_factor": 1000,
        "target_conversion_factor": 1000,
        "target2_conversion_factor": 1000
      }
    ]
  },
  {
    "id": 70,
    "symbol": "pmol/kg",
    "compatible_units": [
      {
        "id": 53,
        "symbol": "",
        "conversion_factor": 5e-13,
        "target_conversion_factor": 2.5e-11,
        "target2_conversion_factor": 2.5e-11
      },
      {
        "id": 66,
        "symbol": "mg/kg",
        "conversion_factor": 5.000000000000001e-7,
        "target_conversion_factor": 0.000025,
        "target2_conversion_factor": 0.000025
      },
      {
        "id": 69,
        "symbol": "µg/kg",
        "conversion_factor": 0.0005,
        "target_conversion_factor": 0.024999999999999998,
        "target2_conversion_factor": 0.024999999999999998
      },
      {
        "id": 68,
        "symbol": "ng/kg",
        "conversion_factor": 0.5,
        "target_conversion_factor": 25,
        "target2_conversion_factor": 25
      },
      {
        "id": 67,
        "symbol": "pg/kg",
        "conversion_factor": 500,
        "target_conversion_factor": 25000,
        "target2_conversion_factor": 25000
      },
      {
        "id": 72,
        "symbol": "µmol/kg",
        "conversion_factor": 0.000001,
        "target_conversion_factor": 0.000001,
        "target2_conversion_factor": 0.000001
      },
      {
        "id": 71,
        "symbol": "nmol/kg",
        "conversion_factor": 0.001,
        "target_conversion_factor": 0.001,
        "target2_conversion_factor": 0.001
      },
      {
        "id": 70,
        "symbol": "pmol/kg",
        "conversion_factor": 1,
        "target_conversion_factor": 1,
        "target2_conversion_factor": 1
      }
    ]
  }
];
