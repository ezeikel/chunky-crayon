import { getRequestConfig } from "next-intl/server";
import messages from "@/messages/en.json";

export default getRequestConfig(async () => {
  return {
    locale: "en",
    messages,
  };
});
