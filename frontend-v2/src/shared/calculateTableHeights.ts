type calculateTableHeightsType = {
    baseHeight: string;
    isOpen: boolean;
    count: number;
    splitMode?: 'first' | 'second';
}

const splitNotificationsCount = (notificationCount: number) => ({
    first: Math.floor(notificationCount / 2),
    second: Math.ceil(notificationCount / 2),
  });

export const calculateTableHeights = ({
    baseHeight,
    isOpen,
    count,
    splitMode
} : calculateTableHeightsType) => {
    if (splitMode === undefined) {
        return isOpen
        ? `calc(${baseHeight} - ${count * 3}rem)`
        : `${baseHeight}`
    };

    return isOpen ? `calc(${baseHeight} - ${splitNotificationsCount(count)[splitMode] * 3}rem)` : `${baseHeight}`
}