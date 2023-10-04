import { DynamicTabs, TabPanel } from '../../components/DynamicTabs';
import HelpTab from './HelpTab';

export type Question = {
  question: string;
  answer: string;
}

const Help: React.FC = () => {
  let generic_questions: Question[] = Array(5).fill({
    question: "Question 1?",
    answer: "Answer 1"
  });
  generic_questions = generic_questions.map((question, index) => {
    return {
      question: `Question ${index + 1}?`,
      answer: `Answer ${index + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`
    }});
    
  const project_questions = generic_questions.slice(0, 2);
  const drug_questions = generic_questions.slice(0, 4)
  const model_questions = generic_questions.slice(0, 3);
  const trial_questions = generic_questions.slice(0, 5);
  const simulation_questions = generic_questions.slice(0, 1)

  return (
    <DynamicTabs tabNames={["Projects", "Drug", "Model", "Trial Design", "Simulation"]}>
      <TabPanel>
        <HelpTab questions={project_questions} />
      </TabPanel>
      <TabPanel>
        <HelpTab questions={drug_questions} />
      </TabPanel>
      <TabPanel>
        <HelpTab questions={model_questions} />
      </TabPanel>
      <TabPanel>
        <HelpTab questions={trial_questions} />
      </TabPanel>
      <TabPanel>
        <HelpTab questions={simulation_questions} />
      </TabPanel>
    </DynamicTabs>
  );
}

export default Help;
