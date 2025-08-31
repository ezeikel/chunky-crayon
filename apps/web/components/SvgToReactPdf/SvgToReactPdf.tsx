import { Svg, Path } from '@react-pdf/renderer';
import parseSvg from '@/utils/parseSvg';

type SvgToReactPdfProps = {
  svgString: string;
  style?: any; // TODO: add proper typing
};

const SvgToReactPdf = ({ svgString, style }: SvgToReactPdfProps) => {
  try {
    const { svgProps, paths } = parseSvg(svgString);

    // make sure we don't spread undefined values
    const filteredSvgProps = Object.fromEntries(
      Object.entries(svgProps).filter(([_, v]) => v !== undefined),
    );

    return (
      <Svg style={style} viewBox="0 0 1024 1024" {...filteredSvgProps}>
        {paths.map((pathProps, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <Path key={index} {...pathProps} />
        ))}
      </Svg>
    );
  } catch (error) {
    console.error('Error parsing SVG:', error);
    return null; // TODO: return a fallback component
  }
};

export default SvgToReactPdf;
