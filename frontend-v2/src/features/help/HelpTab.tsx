import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Question } from "./Help";

interface Props {
  questions: Question[];
}

// tab that lists questions as mui accordian components
const HelpTab: React.FC<Props> = ({ questions }) => {
  return (
    <div>
      {questions.map((question, index) => {
        return (
          <Accordion key={index}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
            >
              <Typography>{question.question}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>{question.answer}</Typography>
            </AccordionDetails>
          </Accordion>
        )
      })}
    </div>
  );
}

export default HelpTab; 
