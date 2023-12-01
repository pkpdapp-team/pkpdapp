import * as React from "react";
import { CombinedModel, Project } from "../../app/backendApi";
import { Control } from "react-hook-form";

interface Props {
  model: CombinedModel;
  project: Project;
  control: Control<CombinedModel>;
}

const TranslationTab: React.FC<Props> = ({
  model,
  project,
  control,
}: Props) => {
  return <div>This is a placeholder component.</div>;
};

export default TranslationTab;
