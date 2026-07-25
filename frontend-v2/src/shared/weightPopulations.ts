// GENERATED FILE — do not edit by hand.
// Source of truth: pkpdapp/pkpdapp/utils/weight_populations.json
// Regenerate with: yarn sync:weight-populations

export interface WeightParams {
  mean: number;
  std: number;
}
export interface RegionWeights {
  female: WeightParams;
  male: WeightParams;
}
export interface WeightPopulations {
  regions: Record<string, RegionWeights>;
  default: RegionWeights;
}

export const weightPopulations: WeightPopulations = {
  "regions": {
    "US": {
      "female": {
        "mean": 77.5,
        "std": 21
      },
      "male": {
        "mean": 90.6,
        "std": 19.5
      }
    },
    "EU": {
      "female": {
        "mean": 67.5,
        "std": 13.8
      },
      "male": {
        "mean": 78.5,
        "std": 13.5
      }
    },
    "ASIA": {
      "female": {
        "mean": 54,
        "std": 9.5
      },
      "male": {
        "mean": 65.3,
        "std": 12.5
      }
    }
  },
  "default": {
    "female": {
      "mean": 67.5,
      "std": 13.8
    },
    "male": {
      "mean": 78.5,
      "std": 13.5
    }
  }
};
