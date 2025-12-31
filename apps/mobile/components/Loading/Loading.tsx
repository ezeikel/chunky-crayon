import { View, ViewStyle, StyleProp } from "react-native";
import Spinner from "@/components/Spinner/Spinner";

type LoadingProps = {
  style?: StyleProp<ViewStyle>;
  spinnerColor?: string;
  className?: string;
};

const Loading = ({ style, spinnerColor, className }: LoadingProps) => {
  return (
    <View
      className={`flex-1 items-center justify-center ${className || ""}`}
      style={style}
    >
      <Spinner color={spinnerColor} />
    </View>
  );
};

export default Loading;
