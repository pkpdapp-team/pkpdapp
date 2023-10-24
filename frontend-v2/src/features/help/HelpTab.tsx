import { Accordion, AccordionDetails, AccordionSummary, Chip, Stack, Typography } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Question, TutorialVideo } from "./Help";
import ReactPlayer from 'react-player/youtube'


interface Props {
  questions: Question[];
  videos: TutorialVideo[];
}

// tab that lists questions as mui accordian components
const HelpTab: React.FC<Props> = ({ questions, videos }) => {
  return (
    <div>
      <Stack spacing={1} sx={{ marginBottom: 2 }}>
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
      </Stack>
      <Stack spacing={2}>
        {videos.map((video, index) => {
          return (
            <div key={index}>
              <Typography variant='h6' >{video.title}</Typography>
              <Stack direction="row" spacing={1} sx={{ marginBottom: 1 }}>
              { video.keywords.map((keyword, index) => {
                return (
                  <Chip size="small" label={keyword} />
                )
              })}
              </Stack>
              <iframe
                key={index}
                allowFullScreen
                src={video.link}
                style={{ border: "none", width: "100%", aspectRatio: "16/9" }}
                title={video.title}
              />
            </div>
          )
        })}
      </Stack>
    </div>
  );
}

export default HelpTab; 
