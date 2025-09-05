import ReactPDF from '@react-pdf/renderer';
import { ColoringImage } from '@chunky-crayon/db/types';
import ColoringPageDocument from '@/components/pdfs/ColoringPageDocument/ColoringPageDocument';

const generatePDF = async (coloringImage: ColoringImage) => {
  const doc = <ColoringPageDocument coloringImage={coloringImage} />;

  try {
    const stream = await ReactPDF.renderToStream(doc);

    return stream;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
};

export default generatePDF;
