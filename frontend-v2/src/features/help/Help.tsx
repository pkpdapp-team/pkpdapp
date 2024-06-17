import { FC, useEffect, useState } from "react";
import { DynamicTabs, TabPanel } from "../../components/DynamicTabs";
import HelpTab from "./HelpTab";
import { parse } from "papaparse";
import { SubPageName } from "../main/mainSlice";

export type Question = {
  question: string;
  answer: string;
};

export type TutorialVideo = {
  title: string;
  type: string;
  link: string;
  keywords: string[];
};

const tutorialVideosUrl: string = "/backend/tutorial_videos.csv";

const TITLE_COLUMN = 0;
const TYPE_COLUMN = 1;
const LINK_COLUMN = 2;
const KEYWORDS_COLUMN = 3;

const Help: FC = () => {
  const [tutorialVideos, setTutorialVideos] = useState<TutorialVideo[]>([]);
  useEffect(() => {
    parse(tutorialVideosUrl, {
      download: true,
      error: (err) => {
        console.error("Error downloading tutorial videos:", err);
      },
      complete: (results) => {
        setTutorialVideos(
          results.data.map((row) => {
            const rowList = row as string[];
            return {
              title: rowList[TITLE_COLUMN],
              type: rowList[TYPE_COLUMN],
              link: rowList[LINK_COLUMN].replace("view?usp=sharing", "preview"),
              keywords: rowList[KEYWORDS_COLUMN].split(",").map((keyword) =>
                keyword.trim(),
              ),
            };
          }),
        );
      },
    });
  }, []);
  let generic_questions: Question[] = Array(5).fill({
    question: "Question 1?",
    answer: "Answer 1",
  });
  generic_questions = generic_questions.map((question, index) => {
    return {
      question: `Question ${index + 1}?`,
      answer: `Answer ${
        index + 1
      }: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
    };
  });

  const questions = [
    generic_questions.slice(0, 0),
    generic_questions.slice(0, 0),
    generic_questions.slice(0, 0),
    generic_questions.slice(0, 0),
    generic_questions.slice(0, 0),
    generic_questions.slice(0, 0),
  ];
  const tutorials = [
    tutorialVideos.filter((video) => video.type.includes("Tutorial")),
    tutorialVideos.filter((video) => video.type === "Project"),
    tutorialVideos.filter((video) => video.type === "Drug"),
    tutorialVideos.filter((video) => video.type === "Model"),
    tutorialVideos.filter((video) => video.type === "Trial Design"),
    tutorialVideos.filter((video) => video.type === "Simulation"),
  ];
  const tabNames = [
    SubPageName.TUTORIALS,
    SubPageName.PROJECTS,
    SubPageName.DRUG,
    SubPageName.MODEL,
    SubPageName.TRAILDESIGN,
    SubPageName.SIMULATION,
  ];
  const disabledTabs = tabNames.filter(
    (name, index) => tutorials[index].length === 0,
  );

  return (
    <DynamicTabs tabNames={tabNames} disabledTabs={disabledTabs}>
      {questions.map((question, index) => (
        <TabPanel key={index}>
          <HelpTab questions={question} videos={tutorials[index]} />
        </TabPanel>
      ))}
    </DynamicTabs>
  );
};

export default Help;
