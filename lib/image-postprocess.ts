import sharp from "sharp";

export type ImagePostProcessOptions = {
  outputSize: 128 | 256 | 512;
  backgroundMode: "transparent" | "simple";
};

export async function pixelPostProcess(inputBuffer: Buffer, options: ImagePostProcessOptions) {
  return sharp(inputBuffer)
    .resize(options.outputSize, options.outputSize, {
      fit: "contain",
      background:
        options.backgroundMode === "transparent"
          ? { r: 0, g: 0, b: 0, alpha: 0 }
          : { r: 14, g: 18, b: 32, alpha: 1 },
      kernel: "nearest",
    })
    .png()
    .toBuffer();
}
