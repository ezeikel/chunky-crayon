import { View } from "react-native";
import tw from "twrnc";
import Spinner from "@/components/Spinner/Spinner";

type LoadingProps = {
  style?: Record<string, unknown>;
  spinnerStyle?: Record<string, unknown>;
};

const Loading = ({ style, spinnerStyle }: LoadingProps) => {
  return (
    <View
      style={tw.style(`flex-1 items-center justify-center`, {
        ...style,
      })}
    >
      <Spinner style={spinnerStyle} />
    </View>
  );
};

export default Loading;
