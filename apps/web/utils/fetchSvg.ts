const fetchSvg = async (url: string): Promise<string> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch SVG: ${response.statusText}`);
  }

  const svgText = await response.text();
  return svgText;
};

export default fetchSvg;
