import { DOMParser } from 'xmldom';

export type SvgProps = {
  width?: string | number;
  height?: string | number;
  viewBox?: string;
  preserveAspectRatio?: string;
  style?: object;
};

export type SvgElementProps = {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  [key: string]: any;
};

const parseSvg = (
  svgString: string,
): {
  svgProps: SvgProps;
  paths: SvgElementProps[];
} => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.documentElement;

  if (!svgElement || svgElement.nodeName !== 'svg') {
    throw new Error('Invalid SVG string: SVG element not found');
  }

  const svgProps: SvgProps = {
    width: svgElement.getAttribute('width') || undefined,
    height: svgElement.getAttribute('height') || undefined,
    viewBox: svgElement.getAttribute('viewBox') || undefined,
    preserveAspectRatio:
      svgElement.getAttribute('preserveAspectRatio') || undefined,
    style: svgElement.getAttribute('style')
      ? JSON.parse(svgElement.getAttribute('style')!)
      : undefined,
  };

  const paths = Array.from(doc.getElementsByTagName('path'))
    .filter((path: Element) => {
      const d = path.getAttribute('d');

      if (!d) {
        console.error('Invalid path element: "d" attribute not found', path);
      }

      return !!d;
    })
    .map((path: Element) => {
      const d = path.getAttribute('d') as string;

      return {
        d,
        fill: path.getAttribute('fill') || undefined,
        stroke: path.getAttribute('stroke') || undefined,
        strokeWidth: path.getAttribute('stroke-width')
          ? parseFloat(path.getAttribute('stroke-width')!)
          : undefined,
      };
    });

  return { svgProps, paths };
};

export default parseSvg;
