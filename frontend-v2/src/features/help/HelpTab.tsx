import { FC } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Question, TutorialVideo } from "./Help";

interface Props {
  questions: Question[];
  videos: TutorialVideo[];
}

// tab that lists questions as mui accordian components
const HelpTab: FC<Props> = ({ questions, videos }) => {
  return (
    <div>
      <Stack spacing={1} sx={{ marginBottom: 2 }}>
        {questions.map((question, index) => {
          return (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{question.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>{question.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
      <Box sx={{ display: "flex", flexWrap: "wrap" }}>
        {videos.map((video, index) => {
          return (
            <Card sx={{ width: "500px", margin: 2, padding: 1 }} key={index}>
              <Typography variant="h6">{video.title}</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                {video.keywords.map((keyword, vindex) => {
                  return (
                    <Chip
                      key={vindex}
                      size="small"
                      label={keyword}
                      sx={{ margin: 0.2 }}
                    />
                  );
                })}
              </Box>
              <iframe
                key={index}
                allowFullScreen
                src={video.link}
                style={{ border: "none", width: "100%", aspectRatio: "16/9" }}
                title={video.title}
              />
            </Card>
          );
        })}
      </Box>
    </div>
  );
};

export default HelpTab;
