import { useSelector } from "react-redux";

import { RootState } from "../app/store";
import {
  TimeIntervalRead,
  useCombinedModelListQuery,
  useCombinedModelUpdateMutation,
} from "../app/backendApi";

export type TimeIntervalUpdate = {
  start_time: number;
  end_time: number;
  unit: number;
};

export function useModelTimeIntervals() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: models } = useCombinedModelListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const model = models?.[0] || null;
  const [updateModel] = useCombinedModelUpdateMutation();
  const updateModelTimeIntervals = (
    timeIntervals: TimeIntervalRead[] | TimeIntervalUpdate[],
  ) => {
    if (model) {
      updateModel({
        id: model.id,
        combinedModel: {
          ...model,
          time_intervals: timeIntervals.map((timeInterval) => ({
            start_time: timeInterval.start_time,
            end_time: timeInterval.end_time,
            pkpd_model: model.id,
            unit: timeInterval.unit,
          })),
        },
      });
    }
  };
  return [model?.time_intervals || [], updateModelTimeIntervals] as [
    TimeIntervalRead[],
    (timeIntervals: TimeIntervalRead[] | TimeIntervalUpdate[]) => void,
  ];
}
