import ReactPDF from "@react-pdf/renderer";
import { ColoringImage } from "@one-colored-pixel/db";
import ColoringPageDocument from "@/components/pdfs/ColoringPageDocument/ColoringPageDocument";

const generatePDFNode = async (
  coloringImage: Partial<ColoringImage>,
  imageSvg: string,
  qrCodeSvg: string,
) => {
  const doc = (
    <ColoringPageDocument
      coloringImage={coloringImage}
      imageSvg={imageSvg}
      qrCodeSvg={qrCodeSvg}
    />
  );

  try {
    const stream = await ReactPDF.renderToStream(doc);

    return stream;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return null;
  }
};

export default generatePDFNode;
