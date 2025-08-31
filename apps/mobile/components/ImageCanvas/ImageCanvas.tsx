import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import {
  GestureResponderEvent,
  PanResponder,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Canvas,
  ImageSVG,
  useCanvasRef,
  useSVG,
  fitbox,
  rect,
  Group,
  SkPath,
  Skia,
  Path,
} from "@shopify/react-native-skia";
import tw from "twrnc";
import { ColoringImage, Dimension, DrawingPath } from "@/types";
import { useColoringContext } from "@/contexts/coloring";
import { perfect } from "@/styles";

type ImageCanvasProps = {
  coloringImage: ColoringImage;
  setScroll: Dispatch<SetStateAction<boolean>>;
  style?: Record<string, unknown>;
};

const ImageCanvas = ({ coloringImage, setScroll, style }: ImageCanvasProps) => {
  const canvasRef = useCanvasRef();
  const { selectedColor } = useColoringContext();
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const svg = useSVG(coloringImage.svgUrl);

  const [svgDimensions, setSvgDimensions] = useState<Dimension | null>(null);

  useEffect(() => {
    if (svg) {
      setSvgDimensions({ width: svg.width(), height: svg.height() });
    }
  }, [svg]);

  const canvasSize = screenWidth;

  const src = svgDimensions
    ? rect(0, 0, svgDimensions.width, svgDimensions.height)
    : rect(0, 0, 1024, 1024);
  const dst = rect(0, 0, canvasSize, canvasSize);

  const transform = useMemo(() => fitbox("contain", src, dst), [src, dst]);

  // taking into account the padding of the parent View (8px on each side)
  const canvasSizeWithPadding = canvasSize - 16;

  const handlePanResponderMove = (event: GestureResponderEvent) => {
    const touchX = event.nativeEvent.locationX;
    const touchY = event.nativeEvent.locationY;
    if (currentPath && svgDimensions) {
      // calculate the scale factor from fitbox "contain"
      const scaleX = canvasSize / svgDimensions.width;
      const scaleY = canvasSize / svgDimensions.height;
      const scale = Math.min(scaleX, scaleY);

      // calculate offset to center the scaled SVG
      const scaledWidth = svgDimensions.width * scale;
      const scaledHeight = svgDimensions.height * scale;
      const offsetX = (canvasSize - scaledWidth) / 2;
      const offsetY = (canvasSize - scaledHeight) / 2;

      // transform touch coordinates to SVG coordinates
      const svgX = (touchX - offsetX) / scale;
      const svgY = (touchY - offsetY) / scale;

      currentPath.lineTo(svgX, svgY);
      setCurrentPath(currentPath.copy());
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (event) => {
      setScroll(false);

      const touchX = event.nativeEvent.locationX;
      const touchY = event.nativeEvent.locationY;
      if (svgDimensions) {
        // calculate the scale factor from fitbox "contain"
        const scaleX = canvasSize / svgDimensions.width;
        const scaleY = canvasSize / svgDimensions.height;
        const scale = Math.min(scaleX, scaleY);

        // calculate offset to center the scaled SVG
        const scaledWidth = svgDimensions.width * scale;
        const scaledHeight = svgDimensions.height * scale;
        const offsetX = (canvasSize - scaledWidth) / 2;
        const offsetY = (canvasSize - scaledHeight) / 2;

        // transform touch coordinates to SVG coordinates
        const svgX = (touchX - offsetX) / scale;
        const svgY = (touchY - offsetY) / scale;

        const newPath = Skia.Path.Make();
        newPath.moveTo(svgX, svgY);
        setCurrentPath(newPath);
      }
    },
    onPanResponderMove: (event) => handlePanResponderMove(event),
    onPanResponderRelease: () => {
      if (currentPath) {
        setPaths([...paths, { path: currentPath, color: selectedColor }]);
        setCurrentPath(null);
      }

      setScroll(true);
    },
  });

  if (!svgDimensions) {
    // render a loading state or nothing until SVG dimensions are available
    return null;
  }

  return (
    <View
      style={tw.style(`bg-white rounded-lg`, {
        height: canvasSizeWithPadding,
        width: canvasSizeWithPadding,
        ...perfect.boxShadow,
        ...style,
      })}
      {...panResponder.panHandlers}
    >
      {svg ? (
        <Canvas
          ref={canvasRef}
          style={tw.style({
            height: canvasSizeWithPadding,
            width: canvasSizeWithPadding,
          })}
        >
          {/* render SVG once to be below the colored paths */}
          <Group transform={transform}>
            <ImageSVG
              x={0}
              y={0}
              width={canvasSize}
              height={canvasSize}
              svg={svg}
            />
            {paths.map((drawingPath, index) => (
              <Path
                key={index}
                path={drawingPath.path}
                color={drawingPath.color}
                style="stroke"
                strokeWidth={5}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
            {currentPath ? (
              <Path
                path={currentPath}
                color={selectedColor}
                style="stroke"
                strokeWidth={5}
                strokeCap="round"
                strokeJoin="round"
              />
            ) : null}
          </Group>
          {/* render SVG again to be on top of the colored paths */}
          <Group transform={transform}>
            <ImageSVG
              x={0}
              y={0}
              width={canvasSize}
              height={canvasSize}
              svg={svg}
            />
          </Group>
        </Canvas>
      ) : null}
    </View>
  );
};

export default ImageCanvas;
