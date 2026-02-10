import imageCompression from 'browser-image-compression';

/**
 * Universal image upload utility with automatic optimization
 *
 * This function handles all property image uploads consistently:
 * 1. Compresses/optimizes images for web display
 * 2. Uploads to server API (which uses Supabase Storage with service role)
 * 3. Returns public URLs
 *
 * @param files - Array of File objects to upload
 * @returns Array of public URLs for uploaded images
 */
export async function uploadPropertyImages(files: File[]): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (const file of files) {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error(`${file.name} is not an image file`);
      }

      // Validate file size (max 10MB before compression)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`${file.name} must be less than 10MB`);
      }

      // Optimize/compress image
      const options = {
        maxSizeMB: 2,           // Target max file size after compression
        maxWidthOrHeight: 2000, // Max dimension for high-quality display
        useWebWorker: true,     // Use web worker for better performance
        quality: 0.85,          // Quality setting (0-1)
        fileType: file.type,    // Maintain original format
      };

      console.log(`Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)...`);

      const compressedFile = await imageCompression(file, options);

      console.log(`Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

      // Upload via API route (uses service role, no token expiration issues)
      const formData = new FormData();
      formData.append('file', compressedFile, file.name);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to upload ${file.name}`);
      }

      uploadedUrls.push(result.url);

      console.log(`Successfully uploaded: ${file.name}`);
    } catch (error: any) {
      console.error(`Error uploading ${file.name}:`, error);
      throw error;
    }
  }

  return uploadedUrls;
}

/**
 * Upload a single image and return its URL
 * Convenience wrapper around uploadPropertyImages
 */
export async function uploadSinglePropertyImage(file: File): Promise<string> {
  const urls = await uploadPropertyImages([file]);
  return urls[0];
}
