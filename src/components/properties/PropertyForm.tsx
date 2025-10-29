"use client";

import React, { useState, useEffect } from "react";
import { supabase, Property } from "@/lib/supabase";
import Image from "next/image";
import PropertyPreview from "./PropertyPreview";
import ImageDropZone from "./ImageDropZone";

interface PropertyFormProps {
  property?: Property | null;
  onSave: () => void;
  onCancel: () => void;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ property, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    type: "warehouse" as Property['type'],
    location: "",
    county: "Miami-Dade" as Property['county'],
    price: "",
    size: "",
    available: true,
    featured: false,
    description: "",
    image: "",
    gallery: [] as string[],
    features: [] as string[],
    street_address: "",
    city: "",
    state: "FL",
    zip_code: "",
    lease_term: "",
    clear_height: "",
    loading_docks: 0,
    parking: 0,
    year_built: new Date().getFullYear(),
  });

  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [featuredImageIndex, setFeaturedImageIndex] = useState<number>(0);

  const [newFeature, setNewFeature] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [counties, setCounties] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    // Use hardcoded counties list
    setCounties([
      { id: '1', name: 'Broward' },
      { id: '2', name: 'Miami-Dade' },
      { id: '3', name: 'Palm Beach' },
      { id: '4', name: 'St. Lucie' },
    ]);

    if (property) {
      const galleryArray = Array.isArray(property.gallery) ? property.gallery : [];
      setFormData({
        title: property.title || "",
        type: property.type || "warehouse",
        location: property.location || "",
        county: property.county || "Miami-Dade",
        price: property.price ? property.price.replace(/[^\d.]/g, '') : "",
        size: property.size ? property.size.replace(/[^\d]/g, '') : "",
        available: property.available || true,
        featured: property.featured || false,
        description: property.description || "",
        image: property.image || "",
        gallery: galleryArray,
        features: Array.isArray(property.features) ? property.features : [],
        street_address: property.street_address || "",
        city: property.city || "",
        state: property.state || "FL",
        zip_code: property.zip_code || "",
        lease_term: property.lease_term || "",
        clear_height: property.clear_height || "",
        loading_docks: property.loading_docks || 0,
        parking: property.parking || 0,
        year_built: property.year_built || new Date().getFullYear(),
      });

      // Set gallery images and featured index for existing property
      setGalleryImages(galleryArray);
      if (property.image && galleryArray.length > 0) {
        const featuredIndex = galleryArray.findIndex(img => img === property.image);
        setFeaturedImageIndex(featuredIndex >= 0 ? featuredIndex : 0);
      }
      setImagePreview(property.image || null);
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Format the data properly for storage
      const propertyData = {
        ...formData,
        price: `$${formData.price}/SF/YR`,
        size: `${formData.size} sq ft`,
        features: formData.features.filter(f => f.trim() !== ""),
        gallery: galleryImages.filter(img => img.trim() !== ""),
      };

      let result;
      if (property?.id) {
        // Update existing property
        result = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', property.id)
          .select();
      } else {
        // Create new property - disable RLS temporarily by using service role
        result = await fetch('/api/properties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(propertyData),
        });

        if (!result.ok) {
          const errorData = await result.json();
          throw new Error(errorData.error || 'Failed to create property');
        }
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving property:', error);
      alert(`Error saving property: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      // Store raw numbers for price and size, integers for other numeric fields
      if (name === 'price' || name === 'size') {
        setFormData(prev => ({ ...prev, [name]: value }));
      } else {
        setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));

      // If it's the image field, also update the preview
      if (name === 'image' && value) {
        setImagePreview(value);
      }
    }
  };

  const addFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    console.log('Starting image upload for', files.length, 'files');
    setUploadingImage(true);

    try {
      const uploadPromises = files.map(async (file, index) => {
        console.log(`Uploading file ${index + 1}: ${file.name}, size: ${file.size}, type: ${file.type}`);

        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image file`);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} must be less than 5MB`);
        }

        // Create a unique filename with timestamp and random string
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2);
        const fileName = `${timestamp}-${randomStr}.${fileExt}`;
        const filePath = `properties/${fileName}`;

        console.log(`Uploading to path: ${filePath}`);

        // Check if bucket exists first
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (bucketsError) {
          console.error('Error listing buckets:', bucketsError);
        } else {
          console.log('Available buckets:', buckets.map(b => b.name));
        }

        // Try to upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);

          // If bucket doesn't exist, try to create it
          if (uploadError.message.includes('Bucket not found')) {
            console.log('Bucket not found, attempting to create...');
            const { error: createBucketError } = await supabase.storage.createBucket('property-images', {
              public: true
            });

            if (createBucketError) {
              console.error('Failed to create bucket:', createBucketError);
              throw new Error(`Failed to upload ${file.name}: Bucket creation failed - ${createBucketError.message}`);
            }

            // Try upload again after creating bucket
            const { data: retryUploadData, error: retryUploadError } = await supabase.storage
              .from('property-images')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (retryUploadError) {
              throw new Error(`Failed to upload ${file.name} after bucket creation: ${retryUploadError.message}`);
            }
          } else {
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
          }
        }

        console.log('Upload successful:', uploadData);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(filePath);

        console.log('Generated public URL:', urlData.publicUrl);
        return urlData.publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      console.log('All uploads completed:', uploadedUrls);

      // Add new images to gallery and form data
      const newGallery = [...galleryImages, ...uploadedUrls];
      setGalleryImages(newGallery);
      setFormData(prev => ({ ...prev, gallery: newGallery }));

      // Set first uploaded image as featured if no featured image exists
      if (galleryImages.length === 0 && uploadedUrls.length > 0) {
        setFormData(prev => ({ ...prev, image: uploadedUrls[0] }));
        setImagePreview(uploadedUrls[0]);
        setFeaturedImageIndex(0);
      }

      // Show success message
      alert(`Successfully uploaded ${uploadedUrls.length} image(s)!`);

    } catch (error: any) {
      console.error('Error uploading images:', error);
      alert(`Error uploading images: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const setFeaturedImage = (imageUrl: string, index: number) => {
    setFormData(prev => ({ ...prev, image: imageUrl }));
    setImagePreview(imageUrl);
    setFeaturedImageIndex(index);
  };

  const removeGalleryImageNew = (index: number) => {
    const newGallery = galleryImages.filter((_, i) => i !== index);
    setGalleryImages(newGallery);
    setFormData(prev => ({ ...prev, gallery: newGallery }));

    // If removed image was featured, set new featured image
    if (index === featuredImageIndex) {
      if (newGallery.length > 0) {
        setFeaturedImage(newGallery[0], 0);
      } else {
        setFormData(prev => ({ ...prev, image: '' }));
        setImagePreview(null);
        setFeaturedImageIndex(0);
      }
    } else if (index < featuredImageIndex) {
      setFeaturedImageIndex(prev => prev - 1);
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[75vh]">
      {/* Form Section */}
      <div className="overflow-y-auto pr-4 max-h-full">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {property ? 'Edit Property' : 'Add New Property'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fill in the property details below
          </p>
        </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Property Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="Enter property title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Property Type *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="warehouse">Warehouse</option>
              <option value="office">Office</option>
              <option value="industrial">Industrial</option>
              <option value="flex-space">Flex Space</option>
              <option value="distribution">Distribution</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="e.g., Doral, Miami"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              County *
            </label>
            <select
              name="county"
              value={formData.county}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {counties.length === 0 ? (
                <option value="">Loading counties...</option>
              ) : (
                counties.map((county) => (
                  <option key={county.id} value={county.name}>
                    {county.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Price per Square Foot *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                className="w-full pl-8 pr-20 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="8.50"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">/SF/YR</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Square Footage *
            </label>
            <div className="relative">
              <input
                type="number"
                name="size"
                value={formData.size}
                onChange={handleInputChange}
                required
                className="w-full pr-16 py-2 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="10000"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">sq ft</span>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Address Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Street Address
              </label>
              <input
                type="text"
                name="street_address"
                value={formData.street_address}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="123 Main Street"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Miami"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                name="zip_code"
                value={formData.zip_code}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="33101"
              />
            </div>
          </div>
        </div>

        {/* Property Details */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Property Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Clear Height
              </label>
              <input
                type="text"
                name="clear_height"
                value={formData.clear_height}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="32 feet"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Loading Docks
              </label>
              <input
                type="number"
                name="loading_docks"
                value={formData.loading_docks}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Parking Spaces
              </label>
              <input
                type="number"
                name="parking"
                value={formData.parking}
                onChange={handleInputChange}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year Built
              </label>
              <input
                type="number"
                name="year_built"
                value={formData.year_built}
                onChange={handleInputChange}
                min="1900"
                max={new Date().getFullYear() + 5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lease Term
            </label>
            <input
              type="text"
              name="lease_term"
              value={formData.lease_term}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="e.g., 5-10 years"
            />
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Property Features</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="Add a feature (e.g., Dock High, Highway Access)"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
            />
            <button
              type="button"
              onClick={addFeature}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add
            </button>
          </div>

          {formData.features.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.features.map((feature, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {feature}
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="Describe the property features and benefits..."
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Property Images</h4>

          <ImageDropZone
            onImagesUploaded={handleImageUpload}
            isUploading={uploadingImage}
            galleryImages={galleryImages}
            featuredImageIndex={featuredImageIndex}
            onSetFeatured={setFeaturedImage}
            onRemoveImage={removeGalleryImageNew}
          />

          {/* Manual Image URL Input (fallback) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Or add image URL manually
            </label>
            <input
              type="url"
              name="image"
              value={formData.image}
              onChange={handleInputChange}
              placeholder="Paste image URL here"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {/* Status Checkboxes */}
        <div className="flex gap-6">
          <div className="flex items-center">
            <input
              id="available"
              name="available"
              type="checkbox"
              checked={formData.available}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="available" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Available for lease
            </label>
          </div>

          <div className="flex items-center">
            <input
              id="featured"
              name="featured"
              type="checkbox"
              checked={formData.featured}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="featured" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Featured property
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : (property ? 'Update Property' : 'Add Property')}
          </button>
        </div>
      </form>
      </div>

      {/* Preview Section */}
      <div className="overflow-y-auto pl-4 border-l border-gray-200 dark:border-gray-700 max-h-full">
        <PropertyPreview formData={formData} />
      </div>
    </div>
  );
};

export default PropertyForm;