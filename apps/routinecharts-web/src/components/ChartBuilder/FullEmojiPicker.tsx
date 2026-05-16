import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

type Props = {
  onPick: (emoji: string) => void;
  onBack: () => void;
};

const FullEmojiPicker = ({ onPick, onBack }: Props) => (
  <div>
    <button
      type="button"
      onClick={onBack}
      className="mb-2 px-2 py-1 text-xs font-medium text-slate-500 hover:text-brand"
    >
      ← Back to quick picks
    </button>
    <Picker
      data={data}
      onEmojiSelect={(picked: { native: string }) => onPick(picked.native)}
      theme="light"
      previewPosition="none"
      skinTonePosition="none"
      perLine={8}
      maxFrequentRows={2}
    />
  </div>
);

export default FullEmojiPicker;
