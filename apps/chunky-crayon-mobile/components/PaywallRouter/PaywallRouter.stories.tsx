import { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { action } from "storybook/actions";
import type { Meta, StoryObj } from "@storybook/react-native";
import PaywallRouter from "./PaywallRouter";

/**
 * PaywallRouter is a thin wrapper that picks one of three paywall
 * surfaces (Subscription / TopUp / ColorAsYouGo). The router's own
 * picking logic depends on:
 *
 *   - the user's entitlement state (useHasSubscription())
 *   - a `variant` prop for the non-subscriber A/B
 *
 * In production we want call sites to import PaywallRouter and forget
 * which one they're getting. In Storybook we use the `forceVariant`
 * escape hatch to render each surface in isolation so this story acts
 * as a one-stop launcher for the entire paywall set.
 *
 * (Each underlying modal also has its own story with the seeded
 * React Query cache — go there for state-specific QA. This story
 * exists to verify the router wiring + a single sidebar entry-point.)
 */

const Forced = ({
  variant,
}: {
  variant: "subscription" | "top_up" | "color_as_you_go";
}) => {
  const [open, setOpen] = useState(true);
  return (
    <View style={{ flex: 1 }}>
      <PaywallRouter
        visible={open}
        onClose={() => {
          action("close")();
          setOpen(false);
        }}
        onSuccess={() => {
          action("success")();
          setOpen(false);
        }}
        forceVariant={variant}
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
              Re-open
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const meta: Meta<typeof PaywallRouter> = {
  title: "Paywalls/PaywallRouter",
  component: PaywallRouter,
};

export default meta;
type Story = StoryObj<typeof PaywallRouter>;

export const Subscription: Story = {
  name: "Forced — subscription paywall",
  render: () => <Forced variant="subscription" />,
};

export const TopUp: Story = {
  name: "Forced — top-up packs (subscriber)",
  render: () => <Forced variant="top_up" />,
};

export const ColorAsYouGo: Story = {
  name: "Forced — color-as-you-go (non-subscriber)",
  render: () => <Forced variant="color_as_you_go" />,
};
