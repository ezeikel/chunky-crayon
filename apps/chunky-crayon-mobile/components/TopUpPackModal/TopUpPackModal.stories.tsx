import { useState, useEffect } from "react";
import { View, Pressable, Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import TopUpPackModal from "./TopUpPackModal";

/**
 * Mobile mirror of web's `Chunky Crayon/05 Modals → Paywall — …` stories.
 *
 * On iOS, App Store rules force all paywall UI into RevenueCat's IAP
 * flow, so we don't have web's three discrete paywall states
 * (`guest_limit` / `no_subscription` / `subscriber_no_credits`).
 * What we have is a single TopUpPackModal that fetches a credits
 * offering from RevenueCat and renders three pack tiers. The useful
 * states to lock down here are the visual shapes that surface:
 *
 *   Default          — packs loaded (100 / 500 / 1000)
 *   Loading          — RevenueCat still fetching
 *   Empty            — offering null / packs unavailable
 *
 * The component fetches via `useQuery({ queryKey: ['revenuecat',
 * 'creditPacks'] })`. The story seeds that query's cache directly so
 * the component skips its real network call and renders against the
 * mock shape we pass in.
 *
 * Pure-visual stories: tapping a pack opens the parental gate then
 * fires the RevenueCat purchase API, which can't run inside Storybook
 * (no native bridge). Buttons render but real purchase is no-op via
 * `skipParentalGate=true` plus an action() spy that intercepts at the
 * mutate boundary. The visuals — pack cards, best-value badge,
 * loading spinner, empty state — are what we're locking down.
 */

// Minimal RevenueCat-shaped offering, prices matched to the SUBSCRIBER
// top-up tier in Stripe (acct_1RN7XNK6qKjkWA8M, CC web): 100/500/1000
// packs at £3 / £12 / £20. See ~/.claude/plans/mobile-paywall-scaffold.md
// for the full Stripe → mobile mapping.
//
// `product.metadata.credits` is the canonical source of credit grants
// (set in the RevenueCat dashboard). The story sets it here so we can
// see the metadata-driven flow working without touching the dashboard.
// In production, App Store / Play Store + RevenueCat hand back
// `priceString` per locale — no hardcoded prices in app code.
const makeOffering = () =>
  ({
    identifier: "credits",
    availablePackages: [
      {
        identifier: "credits_100",
        product: {
          identifier: "credits_100_v1",
          priceString: "£3.00",
          price: 3.0,
          title: "100 Credits",
          metadata: { credits: "100" },
        },
      },
      {
        identifier: "credits_500",
        product: {
          identifier: "credits_500_v1",
          priceString: "£12.00",
          price: 12.0,
          title: "500 Credits",
          metadata: { credits: "500" },
        },
      },
      {
        identifier: "credits_1000",
        product: {
          identifier: "credits_1000_v1",
          priceString: "£20.00",
          price: 20.0,
          title: "1000 Credits",
          metadata: { credits: "1000" },
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
    const key = ["revenuecat", "creditPacks"];
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
      <TopUpPackModal
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

const meta: Meta<typeof TopUpPackModal> = {
  title: "Paywalls/TopUpPackModal",
  component: TopUpPackModal,
};

export default meta;
type Story = StoryObj<typeof TopUpPackModal>;

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
