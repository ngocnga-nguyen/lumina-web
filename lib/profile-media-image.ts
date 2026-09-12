import type { Area } from "react-easy-crop";

export function getProfileMediaOutputType(type: string) {
  return type === "image/png" || type === "image/webp" ? type : "image/jpeg";
}

export function getProfileMediaExtension(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected image could not be opened."));
    image.src = source;
  });
}

export async function createCroppedProfileImage(
  source: string,
  crop: Area,
  sourceType: string
) {
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) throw new Error("The image crop could not be created.");

  const outputSize = Math.max(
    1,
    Math.min(1600, Math.round(Math.min(crop.width, crop.height)))
  );
  canvas.width = outputSize;
  canvas.height = outputSize;

  // Deliberately do not paint a background. PNG exports retain their alpha.
  context.clearRect(0, 0, outputSize, outputSize);
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  const outputType = getProfileMediaOutputType(sourceType);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result
        ? resolve(result)
        : reject(new Error("The image crop could not be exported.")),
      outputType,
      outputType === "image/jpeg" ? 0.92 : undefined
    );
  });

  return new File(
    [blob],
    `profile-${crypto.randomUUID()}.${getProfileMediaExtension(outputType)}`,
    { type: outputType }
  );
}
