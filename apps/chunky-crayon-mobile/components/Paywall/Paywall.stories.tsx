import { useState, useEffect } from "react";
import { View, Pressable, Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import Paywall from "./Paywall";

/**
 * Full-screen subscription paywall (Splash / Rainbow / Sparkle × monthly
 * + annual). This is the direct-render paywall used by the create form,
 * onboarding, and Settings — distinct from the PaywallRouter-driven
 * `SubscriptionPaywallModal`. Plans, prices, and credit grants match
 * Stripe/web pricing; in production RevenueCat hands back per-locale
 * `priceString` from the stores.
 *
 * `Paywall` fetches via `useOfferings()` →
 * `useQuery({ queryKey: ['revenuecat', 'offerings'] })`, so we seed that
 * cache directly to render the loaded / loading / empty states without
 * a live RevenueCat connection. (Same seeding pattern as
 * `SubscriptionPaywallModal.stories.tsx`.)
 *
 * Stories:
 *   Default  — three plans loaded (Rainbow flagged "Most Popular")
 *   Loading  — RevenueCat still fetching (spinner + "Loading plans...")
 *   Empty    — offering null (no plans render)
 */

// Mock RevenueCat offering — six packages: three plans × monthly + annual.
// `getPackagePlanName()` derives SPLASH / RAINBOW / SPARKLE from the
// `product.identifier` prefix; `isAnnualPackage()` reads the package
// `identifier` suffix. Mirrors the SubscriptionPaywallModal fixture.
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

  useEffect(() => {
    const key = ["revenuecat", "offerings"];
    qc.removeQueries({ queryKey: key, exact: true });
    if (state === "default") qc.setQueryData(key, makeOffering());
    else if (state === "empty") qc.setQueryData(key, null);
    // "loading" — leave the cache empty so useQuery reports isLoading.
  }, [qc, state]);

  return (
    <View style={{ flex: 1 }}>
      <Paywall
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

const meta: Meta<typeof Paywall> = {
  title: "Modals/Paywall",
  component: Paywall,
};

export default meta;
type Story = StoryObj<typeof Paywall>;

export const Default: Story = {
  name: "Paywall — plans loaded",
  render: () => <SeededOpen state="default" />,
};

export const Loading: Story = {
  name: "Paywall — loading",
  render: () => <SeededOpen state="loading" />,
};

export const Empty: Story = {
  name: "Paywall — no plans available",
  render: () => <SeededOpen state="empty" />,
};
