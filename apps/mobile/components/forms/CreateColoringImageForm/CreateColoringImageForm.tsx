import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Formik } from "formik";
import { z } from "zod";
import { toFormikValidationSchema } from "zod-formik-adapter";
import tw from "twrnc";
import { queryClient } from "@/providers";
import { createColoringImage } from "@/api";
import Spinner from "@/components/Spinner/Spinner";
import { perfect } from "@/styles";

const createColoringImageSchema = z.object({
  description: z.string().nonempty({ message: "Description is required" }),
});

const CreateColoringImageForm = () => (
  <Formik
    initialValues={{ description: "" }}
    onSubmit={async (values, { resetForm }) => {
      const { coloringImage } = await createColoringImage(values.description);

      // clear input
      resetForm();

      // TODO: refetch only coloring images query
      await queryClient.refetchQueries();

      // navigate to coloring image
      router.push(`/coloring-image/${coloringImage.id}`);
    }}
    validationSchema={toFormikValidationSchema(createColoringImageSchema)}
  >
    {({ handleChange, handleBlur, handleSubmit, values, isSubmitting }) => (
      <View>
        <TextInput
          style={tw.style(
            `text-[#4B4B4B] bg-white border border-[#4B4B4B] rounded-md focus:outline-none min-h-28 p-4`,
            {
              ...perfect.boxShadow,
              fontFamily: "RooneySans-Regular",
              textAlignVertical: "top",
            },
          )}
          onChangeText={handleChange("description")}
          onBlur={handleBlur("description")}
          value={values.description}
          placeholder="e.g. a pirate ship sailing through space"
          multiline
          numberOfLines={4}
        />
        <TouchableOpacity
          style={tw.style(
            `flex-row gap-x-2 justify-center text-white text-lg bg-[#FF8A65] focus:outline-none focus:ring-2 focus:ring-[#FF8A65] focus:ring-offset-2 p-4 rounded-md mt-4`,
            {
              ...perfect.boxShadow,
            },
          )}
          onPress={() => handleSubmit()}
        >
          <Text
            style={tw.style(`text-white text-center`, {
              fontFamily: "TondoTrial-Bold",
            })}
          >
            Generate coloring image
          </Text>
          {isSubmitting ? <Spinner style={tw`text-white`} size={16} /> : null}
        </TouchableOpacity>
      </View>
    )}
  </Formik>
);

export default CreateColoringImageForm;
