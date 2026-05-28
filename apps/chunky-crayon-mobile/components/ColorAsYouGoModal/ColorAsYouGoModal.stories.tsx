import { useState, useEffect } from "react";
import { View, Pressable, Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import ColorAsYouGoModal from "./ColorAsYouGoModal";

/**
 * Mobile paywall surface for NON-subscribers — "Color as you go".
 * Mirrors the same three-state shape as TopUpPackModal stories:
 *
 *   Default — packs loaded (50 / 200 / 500)
 *   Loading — RevenueCat still fetching
 *   Empty   — offering null / packs unavailable
 *
 * Prices matched to Stripe's "Color as you go" tier
 * (acct_1RN7XNK6qKjkWA8M, CC web): 50 / 200 / 500 packs at
 * £2.49 / £8.99 / £19.99. See ~/.claude/plans/mobile-paywall-scaffold.md
 * for the full Stripe → mobile mapping.
 *
 * `product.metadata.credits` is the canonical source of credit grants
 * (set in the RevenueCat dashboard). The story seeds it here so the
 * metadata-driven flow works without touching the dashboard.
 *
 * The component fetches via `useQuery({ queryKey: ['revenuecat',
 * 'colorAsYouGoPacks'] })` against the `color_as_you_go` offering. The
 * story seeds the cache directly so the component skips its real
 * network call and renders against the mock shape we pass in.
 */

const makeOffering = () =>
  ({
    identifier: "color_as_you_go",
    availablePackages: [
      {
        identifier: "cayg_credits_50",
        product: {
          identifier: "cayg_credits_50_v1",
          priceString: "£2.49",
          price: 2.49,
          title: "50 Credits",
          metadata: { credits: "50" },
        },
      },
      {
        identifier: "cayg_credits_200",
        product: {
          identifier: "cayg_credits_200_v1",
          priceString: "£8.99",
          price: 8.99,
          title: "200 Credits",
          metadata: { credits: "200" },
        },
      },
      {
        identifier: "cayg_credits_500",
        product: {
          identifier: "cayg_credits_500_v1",
          priceString: "£19.99",
          price: 19.99,
          title: "500 Credits",
          metadata: { credits: "500" },
        },
      },
    ],
  }) as const;

type SeededState = "default" | "loading" | "empty";

const SeededOpen = ({ state }: { state: SeededState }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);

  // Seed the offering cache before first paint so the component
  // skips its real network call. The cache persists across story
  // switches (single QueryClient at the Storybook preview level),
  // so we MUST clear any prior seed before applying this story's
  // shape — otherwise switching from Default → Loading shows the
  // packs from the previous render.
  useEffect(() => {
    const key = ["revenuecat", "colorAsYouGoPacks"];
    qc.removeQueries({ queryKey: key, exact: true });
    if (state === "default") qc.setQueryData(key, makeOffering());
    else if (state === "empty") qc.setQueryData(key, null);
    // 'loading' intentionally seeds nothing — query stays pending
    // because the real fetcher (Purchases.getOfferings) never
    // resolves inside Storybook.
  }, [qc, state]);

  // Storybook-RN's Pressable taps don't reliably hit onPress through
  // story-wrapping triggers (we've hit this on the Toaster and Magic
  // Color Hint stories too). So instead of rendering a "Open paywall"
  // button, mount the modal opened by default. A small "Re-open"
  // affordance below catches the case where someone tapped the close
  // X and wants to see the modal again without switching stories.
  return (
    <View style={{ flex: 1 }}>
      <ColorAsYouGoModal
        visible={open}
        onClose={() => {
          action("close")();
          setOpen(false);
        }}
        onSuccess={() => {
          action("success")();
          setOpen(false);
        }}
        // Skip the gate in stories — we already have a separate
        // ParentalGate story for that flow. This keeps the focus on
        // the pack-picker UI.
        skipParentalGate
      />
      {!open ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Pressable
            onPress={() => setOpen(true)}
            style={{
              backgroundColor: "#E46444",
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderRadius: 999,
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 16 }}
            >
              Re-open paywall
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const meta: Meta<typeof ColorAsYouGoModal> = {
  title: "Modals/ColorAsYouGoModal",
  component: ColorAsYouGoModal,
};

export default meta;
type Story = StoryObj<typeof ColorAsYouGoModal>;

export const Default: Story = {
  name: "Paywall — packs loaded",
  render: () => <SeededOpen state="default" />,
};

export const Loading: Story = {
  name: "Paywall — loading",
  render: () => <SeededOpen state="loading" />,
};

export const Empty: Story = {
  name: "Paywall — no packs available",
  render: () => <SeededOpen state="empty" />,
};
