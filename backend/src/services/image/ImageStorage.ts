/**
 * ImageStorage (interface)
 *
 * The only contract the rest of the application knows about for storing
 * binary image assets. Deliberately minimal (Interface Segregation): just
 * upload and delete. Nothing above this interface needs to know whether
 * the concrete implementation is Cloudinary, S3, or an in-memory mock.
 */
export interface UploadedImage {
  /** Publicly accessible URL to render the image. */
  url: string;
  /** Provider-specific identifier needed to delete/transform this asset later. */
  providerId: string;
  width?: number;
  height?: number;
}

export interface ImageStorage {
  upload(fileBuffer: Buffer, options: { folder: string; filename: string }): Promise<UploadedImage>;
  delete(providerId: string): Promise<void>;
}
