/** Allowed sticker-slot counts. The PDF route clamps to one of these. */
export const SLOT_OPTIONS = [5, 7, 10, 14, 21, 30] as const;

export type SlotCount = (typeof SLOT_OPTIONS)[number];

export type StickerChartConfig = {
  childName: string;
  goal: string;
  slots: SlotCount;
  reward: string;
};
