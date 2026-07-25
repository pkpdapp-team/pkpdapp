// GENERATED FILE — do not edit by hand.
// Source of truth: pkpdapp/pkpdapp/utils/weight_populations.json
// Regenerate with: yarn sync:weight-populations

export interface WeightParams {
  median: number;
  variance: number;
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
        "median": 77,
        "variance": 0.05
      },
      "male": {
        "median": 89,
        "variance": 0.05
      }
    },
    "EU": {
      "female": {
        "median": 70,
        "variance": 0.05
      },
      "male": {
        "median": 84,
        "variance": 0.05
      }
    },
    "ASIA": {
      "female": {
        "median": 59,
        "variance": 0.05
      },
      "male": {
        "median": 69,
        "variance": 0.05
      }
    }
  },
  "default": {
    "female": {
      "median": 70,
      "variance": 0.05
    },
    "male": {
      "median": 84,
      "variance": 0.05
    }
  }
};
