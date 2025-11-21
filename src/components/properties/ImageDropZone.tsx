"use client";
import React, { useState } from "react";
import { useDropzone } from "react-dropzone";

interface ImageDropZoneProps {
  onImagesUploaded: (files: File[]) => void;
  isUploading: boolean;
  galleryImages: string[];
  featuredImageIndex: number;
  onSetFeatured: (imageUrl: string, index: number) => void;
  onRemoveImage: (index: number) => void;
}

const ImageDropZone: React.FC<ImageDropZoneProps> = ({
  onImagesUploaded,
  isUploading,
  galleryImages,
  featuredImageIndex,
  onSetFeatured,
  onRemoveImage,
}) => {
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);

  const onDrop = (acceptedFiles: File[]) => {
    console.log('🎯 ImageDropZone onDrop called with', acceptedFiles.length, 'files');
    console.log('📊 Current gallery images:', galleryImages.length);
    console.log('📁 Accepted files:', acceptedFiles.map(f => f.name));

    // Check if adding these files would exceed the 12 image limit
    const totalImages = galleryImages.length + acceptedFiles.length;
    if (totalImages > 12) {
      const allowedFiles = acceptedFiles.slice(0, 12 - galleryImages.length);
      alert(`You can only upload up to 12 images per property. Only uploading ${allowedFiles.length} images.`);
      setDraggedFiles(allowedFiles);
      console.log('🚀 Calling onImagesUploaded with limited files:', allowedFiles.length);
      onImagesUploaded(allowedFiles);
    } else {
      setDraggedFiles(acceptedFiles);
      console.log('🚀 Calling onImagesUploaded with all files:', acceptedFiles.length);
      onImagesUploaded(acceptedFiles);
    }
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    multiple: true,
    maxSize: 5 * 1024 * 1024, // 5MB
    // Remove maxFiles restriction to allow multiple selection, we'll handle limits in onDrop
  });

  return (
    <div className="space-y-4">
      {/* Drag and Drop Zone */}
      <div className="transition border-2 border-dashed cursor-pointer rounded-xl hover:border-blue-500 dark:hover:border-blue-500 dark:border-gray-600">
        <div
          {...getRootProps()}
          className={`rounded-xl border-dashed p-6 lg:p-8 transition-all
            ${
              isDragActive
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
            }
            ${isUploading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <input {...getInputProps()} disabled={isUploading} />

          <div className="flex flex-col items-center text-center">
            {/* Upload Icon */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
            </div>

            {/* Upload Text */}
            <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">
              {isDragActive
                ? "Drop images here"
                : isUploading
                ? "Uploading images..."
                : "Drag & drop property images"}
            </h4>

            <p className="mb-4 max-w-sm text-sm text-gray-600 dark:text-gray-400">
              Drop multiple images here or click to browse. Supports PNG, JPG, WebP, GIF up to 5MB each. Maximum 12 images per property.
            </p>

            {galleryImages.length > 0 && (
              <p className="mb-2 text-xs text-gray-500">
                {galleryImages.length}/12 images uploaded
              </p>
            )}

            {!isUploading && (
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Browse Files
              </button>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-4 flex items-center text-blue-600">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Uploading images...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      {galleryImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Uploaded Images ({galleryImages.length})
            </h5>
            <p className="text-xs text-gray-500">Click an image to set as featured</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {galleryImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <div
                  className={`relative w-full h-24 border-2 rounded-lg overflow-hidden bg-white dark:bg-gray-900 cursor-pointer transition-all ${
                    index === featuredImageIndex
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                      : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                  }`}
                  onClick={() => onSetFeatured(imageUrl, index)}
                >
                  <img
                    src={imageUrl}
                    alt={`Property image ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover z-10"
                    style={{ minHeight: '96px', minWidth: '100%' }}
                    onError={(e) => {
                      console.error('Image failed to load:', imageUrl);
                      console.error('Error details:', e);
                      // Show a placeholder or broken image indicator
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.display = 'flex';
                      e.currentTarget.style.alignItems = 'center';
                      e.currentTarget.style.justifyContent = 'center';
                      e.currentTarget.textContent = '❌ Failed to load';
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', imageUrl);
                    }}
                  />

                  {/* Featured Badge */}
                  {index === featuredImageIndex && (
                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded z-20">
                      Featured
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all pointer-events-none z-15" />
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(index);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 focus:opacity-100 focus:outline-none"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• First image is automatically set as featured</p>
            <p>• Click any image to set it as the featured property image</p>
            <p>• Hover over images to see the remove button</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDropZone;