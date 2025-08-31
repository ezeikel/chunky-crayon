import { Stack } from "expo-router";
import { useFonts } from 'expo-font';
import * as Sentry from "@sentry/react-native";
import Providers from "@/providers";
Sentry.init({
  dsn: "https://3ced8899cf0a5a8dd3b15c539379d654:590a9050ad3be778d873c840cb48012c@o358156.ingest.us.sentry.io/4507397854330880",

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
});

const RootLayout = () => {


  const [loaded] = useFonts({
    'RooneySans-Black-Italic': require('../assets/fonts/RooneySans-Black-Italic.ttf'),
    'RooneySans-Black': require('../assets/fonts/RooneySans-Black.ttf'),
    'RooneySans-Bold-Italic': require('../assets/fonts/RooneySans-Bold-Italic.ttf'),
    'RooneySans-Bold': require('../assets/fonts/RooneySans-Bold.ttf'),
    'RooneySans-Heavy-Italic': require('../assets/fonts/RooneySans-Heavy-Italic.ttf'),
    'RooneySans-Heavy': require('../assets/fonts/RooneySans-Heavy.ttf'),
    'RooneySans-Light-Italic': require('../assets/fonts/RooneySans-Light-Italic.ttf'),
    'RooneySans-Light': require('../assets/fonts/RooneySans-Light.ttf'),
    'RooneySans-Medium-Italic': require('../assets/fonts/RooneySans-Medium-Italic.ttf'),
    'RooneySans-Medium': require('../assets/fonts/RooneySans-Medium.ttf'),
    'RooneySans-Regular-Italic': require('../assets/fonts/RooneySans-Regular-Italic.ttf'),
    'RooneySans-Regular': require('../assets/fonts/RooneySans-Regular.ttf'),
    'TondoTrial-Bold': require('../assets/fonts/TondoTrial-Bold.ttf'),
    'TondoTrial-Light': require('../assets/fonts/TondoTrial-Light.ttf'),
    'TondoTrial-Regular': require('../assets/fonts/TondoTrial-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }


  return (
    <Providers>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: "Chunky Crayon",
          }}
        />
        <Stack.Screen
          name="coloring-image/[id]"
          options={
            {
              // headerBackTitleVisible: false,
            }
          }
        />
      </Stack>
    </Providers>
  );
};

export default Sentry.wrap(RootLayout);
