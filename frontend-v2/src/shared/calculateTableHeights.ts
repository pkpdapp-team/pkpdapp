type calculateTableHeightsType = {
  baseHeight: string;
  isOpen: boolean;
  count: number;
  splitMode?: "first" | "second";
};

export const CHANGE_STYLING_INNER_HEIGHT_LIMIT = 700;

export const LOAD_STEPPER_MAIN_CONTENT_HEIGHT =
  "85vh; @media (max-height: 1000px) { height: 84vh }; @media (max-height: 900px) { height: 82vh }; @media (max-height: 800px) { height: 80vh }; @media (max-height: 700px) { height: 77vh }; @media (max-height: 600px) { height: 73vh };";

const splitNotificationsCount = (notificationCount: number) => ({
  first: Math.floor(notificationCount / 2),
  second: Math.ceil(notificationCount / 2),
});

export const calculateTableHeights = ({
  baseHeight,
  isOpen,
  count,
  splitMode,
}: calculateTableHeightsType) => {
  if (window.innerHeight < CHANGE_STYLING_INNER_HEIGHT_LIMIT) {
    return "fit-content";
  }
  if (splitMode === undefined) {
    return isOpen ? `calc(${baseHeight} - ${count * 3}rem)` : `${baseHeight}`;
  }

  return isOpen
    ? `calc(${baseHeight} - ${splitNotificationsCount(count)[splitMode] * 3}rem)`
    : `${baseHeight}`;
};

type getTableHeightType = {
  steps: {
    minHeight: number;
    tableHeight: string;
  }[];
};

export const getTableHeight = ({ steps }: getTableHeightType) => {
  const sortedHeights = steps
    .map(({ minHeight }) => minHeight)
    .sort((a, b) => b - a)
    .find((minHeight) => window.innerHeight > minHeight);

  return (
    steps.find(({ minHeight }) => minHeight === sortedHeights)?.tableHeight ||
    "inherit"
  );
};

export const SINGLE_TABLE_BREAKPOINTS = [
  {
    minHeight: 1100,
    tableHeight: "70vh",
  },
  {
    minHeight: 1000,
    tableHeight: "66vh",
  },
  {
    minHeight: 900,
    tableHeight: "62vh",
  },
  {
    minHeight: 800,
    tableHeight: "58vh",
  },
  {
    minHeight: 700,
    tableHeight: "50vh",
  },
  {
    minHeight: 600,
    tableHeight: "44vh",
  },
  {
    minHeight: 500,
    tableHeight: "44vh",
  },
];

export const DOUBLE_TABLE_FIRST_BREAKPOINTS = [
  {
    minHeight: 1100,
    tableHeight: "25vh",
  },
  {
    minHeight: 1000,
    tableHeight: "25vh",
  },
  {
    minHeight: 900,
    tableHeight: "20vh",
  },
  {
    minHeight: 800,
    tableHeight: "20vh",
  },
  {
    minHeight: 700,
    tableHeight: "18vh",
  },
  {
    minHeight: 600,
    tableHeight: "18vh",
  },
];

export const DOUBLE_TABLE_SECOND_BREAKPOINTS = [
  {
    minHeight: 1100,
    tableHeight: "40vh",
  },
  {
    minHeight: 1000,
    tableHeight: "35vh",
  },
  {
    minHeight: 900,
    tableHeight: "36vh",
  },
  {
    minHeight: 800,
    tableHeight: "32vh",
  },
  {
    minHeight: 700,
    tableHeight: "27vh",
  },
  {
    minHeight: 600,
    tableHeight: "17vh",
  },
];
