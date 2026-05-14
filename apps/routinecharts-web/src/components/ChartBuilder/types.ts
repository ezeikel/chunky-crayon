export type ChartRow = {
  id: string;
  label: string;
  icon: string;
  time: string;
};

export type ChartConfig = {
  childName: string;
  title: string;
  rows: ChartRow[];
};
