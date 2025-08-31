import { SkPath } from "@shopify/react-native-skia";

export type ColoringImage = {
  id: string;
  title: string;
  description: string;
  alt: string;
  url?: string;
  svgUrl?: string;
  qrCodeUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type DrawingPath = {
  path: SkPath;
  color: string;
};

export type Dimension = {
  width: number;
  height: number;
};
