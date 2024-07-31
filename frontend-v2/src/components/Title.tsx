import { Typography } from "@mui/material";

interface Props {
  title: string;
}

export const Title = ({ title }: Props) => (
  <Typography variant="h1" component="h2">
    {title}
  </Typography>
);
