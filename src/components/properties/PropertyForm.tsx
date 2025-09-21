"use client";

import React, { useState, useEffect } from "react";
import { supabase, Property } from "@/lib/supabase";
import Image from "next/image";
import PropertyPreview from "./PropertyPreview";

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

  const [newFeature, setNewFeature] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title || "",
        type: property.type || "warehouse",
        location: property.location || "",
        county: property.county || "Miami-Dade",
        price: property.price || "",
        size: property.size || "",
        available: property.available || true,
        featured: property.featured || false,
        description: property.description || "",
        image: property.image || "",
        gallery: Array.isArray(property.gallery) ? property.gallery : [],
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
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const propertyData = {
        ...formData,
        features: formData.features.filter(f => f.trim() !== ""),
        gallery: formData.gallery.filter(img => img.trim() !== ""),
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
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB.');
      return;
    }

    setUploadingImage(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `properties/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image: urlData.publicUrl }));
      setImagePreview(urlData.publicUrl);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(`Error uploading image: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const addGalleryImage = () => {
    if (formData.image && !formData.gallery.includes(formData.image)) {
      setFormData(prev => ({
        ...prev,
        gallery: [...prev.gallery, formData.image]
      }));
    }
  };

  const removeGalleryImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
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
              <option value="Miami-Dade">Miami-Dade</option>
              <option value="Broward">Broward</option>
              <option value="Palm Beach">Palm Beach</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Price per Square Foot *
            </label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="e.g., $8.50/sq ft"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Square Footage *
            </label>
            <input
              type="text"
              name="size"
              value={formData.size}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="e.g., 25,000 sq ft"
            />
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Main Property Image
            </label>
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  disabled={uploadingImage}
                />
                <p className="text-xs text-gray-500 mt-1">Upload an image (max 5MB) or enter URL below</p>

                <input
                  type="url"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="Or paste image URL here"
                  className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {(formData.image || imagePreview) && (
                <div className="w-32 h-24 border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={imagePreview || formData.image}
                    alt="Property preview"
                    width={128}
                    height={96}
                    className="w-full h-full object-cover"
                    onError={() => setImagePreview(null)}
                  />
                </div>
              )}
            </div>

            {uploadingImage && (
              <div className="flex items-center mt-2 text-blue-600">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading image...
              </div>
            )}
          </div>

          {/* Gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Image Gallery
              </label>
              {formData.image && (
                <button
                  type="button"
                  onClick={addGalleryImage}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Add main image to gallery
                </button>
              )}
            </div>

            {formData.gallery.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {formData.gallery.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <div className="w-24 h-18 border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={imageUrl}
                        alt={`Gallery image ${index + 1}`}
                        width={96}
                        height={72}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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