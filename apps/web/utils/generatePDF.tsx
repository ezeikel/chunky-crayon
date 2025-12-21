import ReactPDF from '@react-pdf/renderer';
import { ColoringImage } from '@chunky-crayon/db/types';
import ColoringPageDocument from '@/components/pdfs/ColoringPageDocument/ColoringPageDocument';
import fetchSvg from '@/utils/fetchSvg';

const generatePDF = async (coloringImage: ColoringImage) => {
  if (!coloringImage.svgUrl || !coloringImage.qrCodeUrl) {
    console.error('Missing SVG URLs for PDF generation');
    return null;
  }

  try {
    // Fetch SVG data before creating the document
    const [imageSvg, qrCodeSvg] = await Promise.all([
      fetchSvg(coloringImage.svgUrl),
      fetchSvg(coloringImage.qrCodeUrl),
    ]);

    const doc = (
      <ColoringPageDocument
        imageSvg={imageSvg}
        qrCodeSvg={qrCodeSvg}
        coloringImageId={coloringImage.id}
      />
    );

    const stream = await ReactPDF.renderToStream(doc);

    return stream;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
};

export default generatePDF;
