import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { useColoringContext } from "./context";
import ProgressIndicator from "./ProgressIndicator";

const meta: Meta<typeof ProgressIndicator> = {
  title: "Coloring/ProgressIndicator",
  component: ProgressIndicator,
};

export default meta;
type Story = StoryObj<typeof ProgressIndicator>;

const ProgressPreview = ({
  progress = 62,
  complete = false,
}: {
  progress?: number;
  complete?: boolean;
}) => {
  const { setColoringProgress, setIsColoringComplete } = useColoringContext();

  useEffect(() => {
    setColoringProgress(progress);
    setIsColoringComplete(complete);
  }, [complete, progress, setColoringProgress, setIsColoringComplete]);

  return <ProgressIndicator />;
};

export const Default: Story = {
  render: () => <ProgressPreview />,
};

export const BothBrands: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      <div
        data-theme="chunky-crayon"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <ProgressPreview progress={78} />
      </div>
      <div
        data-theme="coloring-habitat"
        className="p-6 rounded-coloring-card bg-coloring-surface"
      >
        <ProgressPreview progress={46} />
      </div>
    </div>
  ),
};
