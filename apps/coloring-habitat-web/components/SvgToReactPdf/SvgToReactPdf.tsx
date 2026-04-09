import { Svg, Path } from "@react-pdf/renderer";
import { parseSvg } from "@one-colored-pixel/canvas";

type SvgToReactPdfProps = {
  svgString: string;
  style?: any;
};

const SvgToReactPdf = ({ svgString, style }: SvgToReactPdfProps) => {
  try {
    const { svgProps, paths } = parseSvg(svgString);

    const filteredSvgProps = Object.fromEntries(
      Object.entries(svgProps).filter(([_, v]) => v !== undefined),
    );

    return (
      <Svg style={style} viewBox="0 0 1024 1024" {...filteredSvgProps}>
        {paths.map((pathProps, index) => (
          <Path key={index} {...pathProps} />
        ))}
      </Svg>
    );
  } catch (error) {
    console.error("Error parsing SVG:", error);
    return null;
  }
};

export default SvgToReactPdf;
