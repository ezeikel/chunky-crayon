import { useState, useRef } from "react";
import { View, Pressable, Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import SubscriptionPaywallModal from "./SubscriptionPaywallModal";

/**
 * Mobile mirror of web's subscription paywall surface (Splash / Rainbow
 * / Sparkle × monthly + yearly). Plans, prices, and credit grants
 * match Stripe — see ~/.claude/plans/mobile-paywall-scaffold.md for
 * the full mapping. Prices are mocked here as fixtures; in production
 * RevenueCat hands back per-locale `priceString` from the stores.
 *
 * `product.metadata.credits` is the canonical source of credit grants
 * per plan. The story seeds metadata so the metadata-driven path is
 * exercised; no hardcoded credit numbers in production code.
 *
 * The component fetches via `useOfferings()` which uses
 * `useQuery({ queryKey: ['revenuecat', 'offerings'] })`. We seed that
 * cache directly.
 *
 * Stories:
 *   Default  — packs loaded, yearly cycle selected
 *   Loading  — RevenueCat still fetching
 *   Empty    — offering null
 */

// Mock RevenueCat offering — six packages: three plans × monthly + yearly.
// `getPackagePlanName()` in hooks/usePaywall.ts reads the
// `product.identifier` prefix to derive SPLASH / RAINBOW / SPARKLE, and
// `isAnnualPackage()` reads the package `identifier` suffix.
const makeOffering = () =>
  ({
    identifier: "default",
    availablePackages: [
      {
        identifier: "splash_monthly",
        product: {
          identifier: "splash_monthly_v1",
          priceString: "£2.49",
          price: 2.49,
          title: "Splash Monthly",
          metadata: { credits: "250" },
        },
      },
      {
        identifier: "splash_annual",
        product: {
          identifier: "splash_annual_v1",
          priceString: "£24.99",
          price: 24.99,
          title: "Splash Yearly",
          metadata: { credits: "250" },
        },
      },
      {
        identifier: "$rc_monthly",
        product: {
          identifier: "rainbow_monthly_v1",
          priceString: "£7.99",
          price: 7.99,
          title: "Rainbow Monthly",
          metadata: { credits: "500" },
        },
      },
      {
        identifier: "$rc_annual",
        product: {
          identifier: "rainbow_annual_v1",
          priceString: "£79.99",
          price: 79.99,
          title: "Rainbow Yearly",
          metadata: { credits: "500" },
        },
      },
      {
        identifier: "sparkle_monthly",
        product: {
          identifier: "sparkle_monthly_v1",
          priceString: "£13.99",
          price: 13.99,
          title: "Sparkle Monthly",
          metadata: { credits: "1000" },
        },
      },
      {
        identifier: "sparkle_annual",
        product: {
          identifier: "sparkle_annual_v1",
          priceString: "£139.99",
          price: 139.99,
          title: "Sparkle Yearly",
          metadata: { credits: "1000" },
        },
      },
    ],
  }) as const;

type SeededState = "default" | "loading" | "empty";

const SeededOpen = ({ state }: { state: SeededState }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);

  // Seed SYNCHRONOUSLY during render, BEFORE the modal mounts and fires
  // its useOfferings() queryFn. In Storybook that queryFn calls the
  // native RevenueCat SDK, which never resolves — so a post-mount
  // useEffect seed races a hanging fetch and the UI stays stuck on the
  // loader. Seeding here (once, guarded) plus a far-future staleTime via
  // setQueryData means the query reads cached data on its first render
  // and never shows the spinner. The state-keyed guard lets a story
  // switch re-seed for the new state.
  const seededFor = useRef<SeededState | null>(null);
  if (seededFor.current !== state) {
    const key = ["revenuecat", "offerings"];
    if (state === "default") qc.setQueryData(key, makeOffering());
    else if (state === "empty") qc.setQueryData(key, null);
    else qc.removeQueries({ queryKey: key, exact: true });
    seededFor.current = state;
  }

  return (
    <View style={{ flex: 1 }}>
      <SubscriptionPaywallModal
        visible={open}
        onClose={() => {
          action("close")();
          setOpen(false);
        }}
        onSuccess={() => {
          action("success")();
          setOpen(false);
        }}
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

const meta: Meta<typeof SubscriptionPaywallModal> = {
  title: "Paywalls/SubscriptionPaywallModal",
  component: SubscriptionPaywallModal,
};

export default meta;
type Story = StoryObj<typeof SubscriptionPaywallModal>;

export const Default: Story = {
  name: "Subscriptions — plans loaded",
  render: () => <SeededOpen state="default" />,
};

export const Loading: Story = {
  name: "Subscriptions — loading",
  render: () => <SeededOpen state="loading" />,
};

export const Empty: Story = {
  name: "Subscriptions — no plans available",
  render: () => <SeededOpen state="empty" />,
};
