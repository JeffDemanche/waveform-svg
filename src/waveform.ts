import * as fs from "fs";
import * as path from "path";

// Doesn't have types but we don't really need em.
import * as decode from "audio-decode";
import * as D3Node from "d3-node";
import { assert } from "console";

interface Summary {
  /** In samples */
  windowWidth: number;

  numWindows: number;

  /** Array of "data points" */
  windows: { amplitude: number }[];
}

export class Waveform {
  private _audioBuffer: AudioBuffer;

  private _channelData: Float32Array[];

  private _durationSamples: number;

  private _summary: Summary;

  /**
   * @param filename audio file name relative to the audio folder.
   * @returns promise that resolves when loading is complete.
   */
  async loadFromFile(filename: string): Promise<void> {
    return new Promise((resolve) => {
      const audioFile = fs.readFileSync(
        path.join(__dirname, `../audio/${filename}`)
      );

      decode(audioFile).then((audioBuffer: AudioBuffer) => {
        this._audioBuffer = audioBuffer;
        this._durationSamples = audioBuffer.length;
        this._channelData = [];
        for (let c = 0; c < this._audioBuffer.numberOfChannels; c++) {
          this._channelData.push(audioBuffer.getChannelData(c));
        }

        resolve();
      });
    });
  }

  generateSummaryMean(windowWidth: number, channel: number): void {
    console.time("generate summary");

    const numWindows = Math.ceil(this._audioBuffer.length / windowWidth);

    const summary: Summary = {
      numWindows,
      windowWidth,
      windows: [],
    };

    let windowAcc = 0;
    let windowIndex = 0;

    for (let i = 0; i < this._durationSamples; i++) {
      const thisData = this._channelData[channel][i];
      windowAcc += Math.abs(thisData);

      if (i === this._audioBuffer.length - 1) {
        summary.windows.push({ amplitude: windowAcc / windowIndex });
      } else if (windowIndex === windowWidth - 1) {
        summary.windows.push({ amplitude: windowAcc / windowWidth });
        windowIndex = 0;
        windowAcc = 0;
      } else {
        windowIndex++;
      }
    }

    assert(summary.numWindows === summary.windows.length);

    this._summary = summary;

    console.timeEnd("generate summary");
  }

  writeSummaryToSVG(width: number, height: number, outFilename: string): void {
    console.time("write svg");

    const d3n = new D3Node();
    const svg = d3n.createSVG(width, height);

    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("style", "stop-color: rgb(255,255,0); stop-opacity: 1;");

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("style", "stop-color: rgb(255,0,0); stop-opacity: 1;");

    const wf_g = svg.append("g");

    const half_height = height / 2;

    const path_d = () => {
      const pixelWindowWidth =
        width * (this._summary.windowWidth / this._durationSamples);

      // Draw a path for the top half.
      const linesTop = this._summary.windows.map((window, i) => {
        return `L ${i * pixelWindowWidth},${
          half_height - window.amplitude * half_height
        }`;
      });
      // Finish path at the end, amplitude 0.
      linesTop.push(`L ${width} ${half_height}`);

      // Continue path for bottom half.
      const linesBottom = this._summary.windows
        .map((window, i) => {
          return `L ${i * pixelWindowWidth},${
            half_height + window.amplitude * half_height
          }`;
        })
        .reverse();

      return `M 0,${half_height} ${linesTop.join(" ")} ${linesBottom.join(
        " "
      )}`;
    };

    const wf_path = wf_g
      .append("path")
      .attr("fill", "url(#grad)")
      .attr("d", path_d());

    fs.writeFileSync(
      path.join(__dirname, `../output/${outFilename}`),
      d3n.svgString()
    );

    console.timeEnd("write svg");
  }
}
