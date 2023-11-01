import React, { useEffect } from 'react';
import { DynamicTabs, TabPanel } from '../../components/DynamicTabs';
import HelpTab from './HelpTab';
import { parse } from 'papaparse';
import { set } from 'react-hook-form';
import { Container } from '@mui/material';

export type Question = {
  question: string;
  answer: string;
}

export type TutorialVideo = {
  title: string;
  type: string;
  link: string;
  keywords: string[];
}

const tutorialVideosUrl: string = '/backend/tutorial_videos.csv';

const Help: React.FC = () => {
  const [ tutorialVideos, setTutorialVideos ] = React.useState<TutorialVideo[]>([]);
  useEffect(() => {
    parse(tutorialVideosUrl, {
      download: true,
      error: (err) => {
        console.error('Error downloading tutorial videos:', err);
      },
      complete: (results) => {
        setTutorialVideos(
          results.data.map((row) => {
            const rowList = row as string[];
            return {
              title: rowList[0],
              type: rowList[1],
              link: rowList[2].replace('view?usp=sharing', 'preview'),
              keywords: rowList[3].split(',').map((keyword) => keyword.trim())
            };
          })
        );
      }
    })
  }, []);
  let generic_questions: Question[] = Array(5).fill({
    question: "Question 1?",
    answer: "Answer 1"
  });
  generic_questions = generic_questions.map((question, index) => {
    return {
      question: `Question ${index + 1}?`,
      answer: `Answer ${index + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`
    }});
  
  const questions = [
    generic_questions.slice(0, 2),
    generic_questions.slice(0, 4),
    generic_questions.slice(0, 3),
    generic_questions.slice(0, 5),
    generic_questions.slice(0, 1),
  ]
  const tutorials = [
    tutorialVideos.filter((video) => video.type.includes('Tutorial')),
    tutorialVideos.filter((video) => video.type === 'Project'),
    tutorialVideos.filter((video) => video.type === 'Drug'),
    tutorialVideos.filter((video) => video.type === 'Model'),
    tutorialVideos.filter((video) => video.type === 'Trial Design'),
    tutorialVideos.filter((video) => video.type === 'Simulation'),
  ]
    
  const project_questions = generic_questions.slice(0, 2);
  const drug_questions = generic_questions.slice(0, 4)
  const model_questions = generic_questions.slice(0, 3);
  const trial_questions = generic_questions.slice(0, 5);
  const simulation_questions = generic_questions.slice(0, 1)

  return (
    <DynamicTabs tabNames={["Tutorials", "Projects", "Drug", "Model", "Trial Design", "Simulation"]}>
      { questions.map((question, index) => (
        <TabPanel key={index}>
          <HelpTab questions={question} videos={tutorials[index]} />
        </TabPanel>
      ))}
    </DynamicTabs>
  );
}

export default Help;
