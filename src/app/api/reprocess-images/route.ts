import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TARGET_WIDTH = 1920;
const JPEG_QUALITY = 95;

export async function POST(request: NextRequest) {
  try {
    // List all files in the properties folder
    const { data: files, error: listError } = await supabase.storage
      .from('property-images')
      .list('properties', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

    if (listError) {
      return NextResponse.json({ error: `Failed to list files: ${listError.message}` }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No images found', processed: 0 });
    }

    const results: { file: string; status: string; before?: string; after?: string }[] = [];
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of files) {
      const filePath = `properties/${file.name}`;

      try {
        // Download the image
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('property-images')
          .download(filePath);

        if (downloadError || !fileData) {
          results.push({ file: file.name, status: `download failed: ${downloadError?.message}` });
          failed++;
          continue;
        }

        const inputBuffer = Buffer.from(await fileData.arrayBuffer());
        const metadata = await sharp(inputBuffer).metadata();
        const originalWidth = metadata.width || 0;
        const originalSize = inputBuffer.length;

        // Skip if already at or above target width
        if (originalWidth >= TARGET_WIDTH) {
          results.push({ file: file.name, status: `skipped (already ${originalWidth}px)` });
          skipped++;
          continue;
        }

        // Process with Sharp - upscale to 1920px
        const processedBuffer = await sharp(inputBuffer)
          .resize(TARGET_WIDTH, null, {
            withoutEnlargement: false,
            kernel: sharp.kernel.lanczos3,
            fit: 'inside',
          })
          .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
          .toBuffer();

        // Overwrite the file in Supabase
        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .update(filePath, processedBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          // Try remove + upload if update fails
          await supabase.storage.from('property-images').remove([filePath]);
          const { error: retryError } = await supabase.storage
            .from('property-images')
            .upload(filePath, processedBuffer, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: true,
            });

          if (retryError) {
            results.push({ file: file.name, status: `upload failed: ${retryError.message}` });
            failed++;
            continue;
          }
        }

        results.push({
          file: file.name,
          status: 'processed',
          before: `${originalWidth}px / ${(originalSize / 1024).toFixed(0)}KB`,
          after: `${TARGET_WIDTH}px / ${(processedBuffer.length / 1024).toFixed(0)}KB`,
        });
        processed++;
      } catch (err) {
        results.push({ file: file.name, status: `error: ${err instanceof Error ? err.message : 'unknown'}` });
        failed++;
      }
    }

    return NextResponse.json({
      message: `Reprocessing complete`,
      total: files.length,
      processed,
      skipped,
      failed,
      results,
    });
  } catch (error) {
    console.error('Error in reprocess-images:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
