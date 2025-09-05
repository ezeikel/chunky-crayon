import ReactPDF from '@react-pdf/renderer';
import { ColoringImage } from '@chunky-crayon/db';
import ColoringPageNodeDocument from '@/components/pdfs/ColoringPageNodeDocument/ColoringPageNodeDocument';

const generatePDFNode = async (
  coloringImage: Partial<ColoringImage>,
  imageSvg: string,
  qrCodeSvg: string,
) => {
  const doc = (
    <ColoringPageNodeDocument
      coloringImage={coloringImage}
      imageSvg={imageSvg}
      qrCodeSvg={qrCodeSvg}
    />
  );

  try {
    const stream = await ReactPDF.renderToStream(doc);

    return stream;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
};

export default generatePDFNode;
