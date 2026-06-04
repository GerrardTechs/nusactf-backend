import { mkdirSync, existsSync, writeFileSync, createReadStream } from "node:fs";
import path from "node:path";
import type { FastifyInstance, FastifyReply } from "fastify";
import { challengesAssetsPath } from "../../config/env.js";

export const FOTO_KENANGAN_FLAG = "NusaCTF{bukan_sekadar_foto_biasa_1337}";

const IMAGE_FILENAME = "kenangan.jpg";
const EXIF_COMMENT = `NusaCTF Comment: ${FOTO_KENANGAN_FLAG}`;

/** Minimal valid 1x1 JPEG (base64) — safe template for stego append. */
const BASE_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAAQABAAD/2wCEAAkGBxISEhUQEhEVFhUVFRUVFRUVFRUWFxUXFhUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGxAQGy0lICUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAAAAQIE/8QAFhABAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIQAxAAAAGqAf/EABYRAQEBAAAAAAAAAAAAAAAAAAARAP/aAAgBAQABBQL/AM//xAAVEQEBAAAAAAAAAAAAAAAAAAAQAP/aAAgBAwEBPwFBP//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8BP//EABYRAQEBAAAAAAAAAAAAAAAAAAARAP/aAAgBAQAGPwJqT//EABYRAQEBAAAAAAAAAAAAAAAAAAARAP/aAAgBAQABPyFSlP/Z",
  "base64"
);

export function getKenanganImagePath(): string {
  return path.join(challengesAssetsPath, IMAGE_FILENAME);
}

/**
 * Embeds flag twice:
 * 1. Fake EXIF comment block (plaintext marker for exiftool/strings)
 * 2. EOF append after JPEG EOI marker (FF D9)
 */
export function ensureKenanganImage(): string {
  mkdirSync(challengesAssetsPath, { recursive: true });

  const outputPath = getKenanganImagePath();

  if (existsSync(outputPath)) {
    return outputPath;
  }

  const exifBlock = Buffer.from(
    `\n\x00\x00Exif\x00\x00MM\x00*\x00\x00\x00\x08\x00\x01\x87\x69\x00\x04\x00\x00\x00\x01\x00\x00\x00\x1a\x00\x00\x00\x00${EXIF_COMMENT}\x00`,
    "binary"
  );

  const eofPayload = Buffer.from(`\n<!-- ${FOTO_KENANGAN_FLAG} -->\n`, "utf8");
  const imageBuffer = Buffer.concat([BASE_JPEG, exifBlock, eofPayload]);

  writeFileSync(outputPath, imageBuffer);
  return outputPath;
}

export function streamKenanganImage(reply: FastifyReply): FastifyReply {
  const imagePath = ensureKenanganImage();
  reply.header("Content-Type", "image/jpeg");
  reply.header(
    "Content-Disposition",
    'attachment; filename="foto-kenangan.jpg"'
  );
  return reply.send(createReadStream(imagePath));
}

export async function registerFotoKenanganRoutes(
  fastify: FastifyInstance
): Promise<void> {
  ensureKenanganImage();

  fastify.get("/foto-kenangan", async (_request, reply) => {
    return reply.send({
      title: "Foto Kenangan",
      imageUrl: "/api/challenges/foto-kenangan/image",
      instructions:
        "Unduh gambar dan analisis metadata EXIF atau byte di akhir file.",
    });
  });

  fastify.get("/foto-kenangan/image", async (_request, reply) => {
    return streamKenanganImage(reply);
  });
}
