import imageCompression from 'browser-image-compression';
import { supabaseAdmin } from './supabase';

/**
 * Universal image upload utility with automatic optimization
 *
 * This function handles all property image uploads consistently:
 * 1. Compresses/optimizes images for web display
 * 2. Uploads to Supabase Storage
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

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `properties/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from('property-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('property-images')
        .getPublicUrl(filePath);

      uploadedUrls.push(urlData.publicUrl);

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
