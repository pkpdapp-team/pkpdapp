import { FC, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { StepperState } from "./LoadDataStepper";
import { findFieldByType } from "./findFieldByType";

interface FieldMapping {
  label: string; // Display name (e.g., "Amount Unit")
  type: string; // Normalized field type (e.g., "Amount Unit")
  optional?: boolean; // Whether this field is optional
}

interface MappingSummaryProps {
  state: StepperState;
  fields: FieldMapping[];
  title: string;
}

const MappingSummary: FC<MappingSummaryProps> = ({ state, fields, title }) => {
  const [expanded, setExpanded] = useState(true);

  const handleChange = () => {
    setExpanded(!expanded);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Accordion expanded={expanded} onChange={handleChange}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="mapping-summary-content"
          id="mapping-summary-header"
        >
          <Typography variant="h6">{title}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {fields.map((field) => {
              const mappedField = findFieldByType(field.type, state);
              const isMapped = mappedField !== field.type;
              const displayText = isMapped
                ? `${field.label}: (from column "${mappedField}")`
                : `${field.label}: Not mapped`;

              return (
                <ListItem key={field.type} disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {isMapped ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <CancelIcon color="disabled" fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={displayText}
                    primaryTypographyProps={{
                      variant: "body2",
                      color: isMapped ? "text.primary" : "text.disabled",
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default MappingSummary;
