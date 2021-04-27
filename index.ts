/**
 * Playground for generating waveforms from audio data.
 */

import { Waveform } from "./src/waveform";

const processData = async () => {
  const waveform = new Waveform();
  await waveform.loadFromFile(process.argv[2]);
  waveform.generateSummaryMean(25000, 0);
  waveform.writeSummaryToSVG(
    Number.parseInt(process.argv[3]),
    Number.parseInt(process.argv[4]),
    `${process.argv[2]}.svg`
  );
};

processData();
