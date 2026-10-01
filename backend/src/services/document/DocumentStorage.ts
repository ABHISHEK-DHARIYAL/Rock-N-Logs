/**
 * DocumentStorage (interface)
 *
 * The document-storage counterpart to services/image/ImageStorage.
 * Deliberately a separate interface rather than extending ImageStorage
 * (Interface Segregation) — image and document assets have different
 * remote APIs (Cloudinary's image vs. raw upload endpoints) and there's
 * no reuse to be had by forcing them through one interface.
 */
export interface UploadedDocument {
  /** Publicly accessible URL to view/download the file. */
  url: string;
  /** Provider-specific identifier needed to delete this asset later. */
  providerId: string;
}

export interface DocumentStorage {
  upload(fileBuffer: Buffer, options: { folder: string; filename: string }): Promise<UploadedDocument>;
  delete(providerId: string): Promise<void>;
}
