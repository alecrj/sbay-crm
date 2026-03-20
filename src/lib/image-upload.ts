/**
 * Universal image upload utility
 *
 * Uploads property images to Supabase Storage at full quality.
 * No client-side compression — images stay crisp as uploaded.
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

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`${file.name} must be less than 10MB`);
      }

      console.log(`Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)...`);

      // Upload original file at full quality — no compression
      const formData = new FormData();
      formData.append('file', file, file.name);

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
