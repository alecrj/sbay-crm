'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useUserRole } from '../../../contexts/UserRoleContext';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import ImageDropZone from '../../../components/properties/ImageDropZone';

interface Property {
  id: string;
  title: string;
  type: string;
  location: string;
  size: string;
  price: string;
  description: string;
  featured: boolean;
  available: boolean;
  image?: string;
  created_at: string;
  updated_at: string;
}

export default function PropertiesPage() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, roleLoading, router]);

  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'warehouse',
    property_type: 'single' as 'single' | 'multi_unit',
    location: '',
    county: '',
    street_address: '',
    city: '',
    zip_code: '',
    size: '',
    price: '',
    description: '',
    featured: false,
    available: true,
    image: '',
    gallery: [] as string[],
    features: [] as string[]
  });

  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [featuredImageIndex, setFeaturedImageIndex] = useState<number>(0);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Available feature options
  const availableFeatures = [
    'Loading Docks',
    'High Ceilings',
    'Modern HVAC',
    'Security System',
    'Truck Access',
    'City Views',
    'Furnished',
    'Conference Rooms',
    'High-Speed Internet',
    'Parking Included',
    'Overhead Cranes',
    'Heavy Power',
    'Rail Access',
    'Large Lot',
    'Specialized Equipment',
    'Dock High',
    '32\' Clear',
    'Highway Access',
    'Grade Level',
    'Flex Space',
    'Cross Dock',
    'Airport Access',
    '30\' Clear',
    '3-Phase Power',
    'Crane Ready',
    'Secured Yard'
  ];

  // Custom feature input
  const [customFeature, setCustomFeature] = useState('');

  // Helper functions
  const addFeature = (feature: string) => {
    if (!formData.features.includes(feature)) {
      setFormData({...formData, features: [...formData.features, feature]});
    }
  };

  const removeFeature = (feature: string) => {
    setFormData({...formData, features: formData.features.filter(f => f !== feature)});
  };

  const addCustomFeature = () => {
    if (customFeature.trim() && !formData.features.includes(customFeature.trim())) {
      setFormData({...formData, features: [...formData.features, customFeature.trim()]});
      setCustomFeature('');
    }
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
              public: true,
              allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
              fileSizeLimit: 5242880 // 5MB
            });

            if (createBucketError) {
              console.error('Failed to create bucket:', createBucketError);
              throw new Error(`Failed to upload ${file.name}: Bucket creation failed - ${createBucketError.message}`);
            }

            console.log('Bucket created successfully, retrying upload...');

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

            console.log('Retry upload successful:', retryUploadData);
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

        // Verify the URL is accessible
        try {
          const testResponse = await fetch(urlData.publicUrl, { method: 'HEAD' });
          console.log('Image URL test response:', testResponse.status, testResponse.statusText);
          if (!testResponse.ok) {
            console.warn('Image URL not accessible:', urlData.publicUrl);
          }
        } catch (error) {
          console.error('Error testing image URL:', error);
        }

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
    setFeaturedImageIndex(index);
  };

  const removeGalleryImage = (index: number) => {
    const newGallery = galleryImages.filter((_, i) => i !== index);
    setGalleryImages(newGallery);
    setFormData(prev => ({ ...prev, gallery: newGallery }));

    // If removed image was featured, set new featured image
    if (index === featuredImageIndex) {
      if (newGallery.length > 0) {
        setFeaturedImage(newGallery[0], 0);
      } else {
        setFormData(prev => ({ ...prev, image: '' }));
        setFeaturedImageIndex(0);
      }
    } else if (index < featuredImageIndex) {
      setFeaturedImageIndex(prev => prev - 1);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error loading properties:', error);
        console.error('Error details:', {
          message: error.message,
          hint: error.hint,
          details: error.details,
          code: error.code
        });

        // If table doesn't exist, show empty state
        if (error.code === '42P01') {
          console.log('Properties table does not exist yet. Please run the CREATE_PROPERTIES_TABLE.sql script.');
          setProperties([]);
          return;
        }

        throw error;
      }

      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
      // Set empty array on any error to prevent UI crashes
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🚀 Form submission started');
    console.log('📝 Form data:', formData);
    console.log('✏️ Editing property:', editingProperty);

    try {
      // Format the data properly for storage
      const propertyData = {
        ...formData,
        price: `$${formData.price}/SF/YR`,
        size: `${formData.size} sq ft`,
        location: formData.city ? `${formData.city}${formData.county ? ', ' + formData.county : ''}, FL` : '',
        gallery: galleryImages.filter(img => img.trim() !== "")
      };

      if (editingProperty) {
        console.log('✏️ Updating property via API...');

        const response = await fetch(`/api/properties?id=${editingProperty.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(propertyData)
        });

        const result = await response.json();
        console.log('🔥 Update API response:', { status: response.status, result });

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update property');
        }

        console.log('✅ Property updated successfully via API');
      } else {
        console.log('➕ Creating new property with calendar via API...');

        const response = await fetch('/api/properties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(propertyData)
        });

        const result = await response.json();
        console.log('🔥 API response:', { status: response.status, result });

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create property');
        }

        console.log('✅ Property and calendar created successfully via API');
      }

      console.log('✅ Property saved successfully');
      await loadProperties();
      resetForm();
    } catch (error) {
      console.error('Error saving property:', error);

      // Provide specific error messages
      if (error instanceof Error) {
        if (error.message.includes('relation "properties" does not exist')) {
          alert('Properties table not found. Please run the CREATE_PROPERTIES_TABLE.sql script in Supabase first.');
        } else {
          alert(`Error saving property: ${error.message}`);
        }
      } else {
        alert('Error saving property. Please check the console for details.');
      }
    }
  };

  const handleEdit = (property: any) => {
    setEditingProperty(property);
    const galleryArray = Array.isArray(property.gallery) ? property.gallery : [];
    setFormData({
      title: property.title,
      type: property.type,
      location: property.location,
      county: property.county || '',
      street_address: property.street_address || '',
      city: property.city || '',
      zip_code: property.zip_code || '',
      size: property.size ? property.size.replace(/[^\d]/g, '') : '',
      price: property.price ? property.price.replace(/[^\d.]/g, '') : '',
      description: property.description,
      featured: property.featured,
      available: property.available,
      image: property.image || '',
      gallery: galleryArray,
      features: property.features || []
    });

    // Set gallery images and featured index for existing property
    setGalleryImages(galleryArray);
    if (property.image && galleryArray.length > 0) {
      const featuredIndex = galleryArray.findIndex(img => img === property.image);
      setFeaturedImageIndex(featuredIndex >= 0 ? featuredIndex : 0);
    }

    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;

    try {
      console.log('🗑️ Deleting property and calendar via API...');

      const response = await fetch(`/api/properties?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      console.log('🔥 Delete API response:', { status: response.status, result });

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete property');
      }

      console.log('✅ Property and calendar deleted successfully via API');
      await loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'warehouse',
      location: '',
      county: '',
      street_address: '',
      city: '',
      zip_code: '',
      size: '',
      price: '',
      description: '',
      featured: false,
      available: true,
      image: '',
      gallery: [],
      features: []
    });
    setGalleryImages([]);
    setFeaturedImageIndex(0);
    setEditingProperty(null);
    setShowForm(false);
    setCustomFeature('');
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                🏢 Property Management
              </h1>
              <p className="text-gray-600">
                Manage properties that appear on your website
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Add Property
            </button>
          </div>
        </div>

        {/* Full Screen Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {editingProperty ? 'Edit Property' : 'Add New Property'}
                  </h1>
                </div>
                <button
                  onClick={resetForm}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Property Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Warehouse in Miami"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Type *
                      </label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="warehouse">Warehouse</option>
                        <option value="office">Office Space</option>
                        <option value="industrial">Industrial</option>
                        <option value="flex-space">Flex Space</option>
                        <option value="distribution">Distribution Center</option>
                      </select>
                    </div>
                  </div>

                  {/* Property Type Selection */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Property Type *
                      </label>
                      <select
                        required
                        value={formData.property_type}
                        onChange={(e) => setFormData({...formData, property_type: e.target.value as 'single' | 'multi_unit'})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="single">Single Property (Standard listing)</option>
                        <option value="multi_unit">Multi-Unit Building (Add units after saving)</option>
                      </select>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {formData.property_type === 'single'
                          ? 'This property will have its own detail page and booking calendar.'
                          : 'This building will have an overview page. You\'ll add individual units with their own pages and booking calendars in the next step.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pricing & Details Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pricing & Details</h3>
                  <div className="space-y-6">

                    {/* Detailed Address Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Street Address
                        </label>
                        <input
                          type="text"
                          value={formData.street_address}
                          onChange={(e) => setFormData({...formData, street_address: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="1234 Industrial Blvd"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.city}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Miami"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          County
                        </label>
                        <select
                          value={formData.county}
                          onChange={(e) => setFormData({...formData, county: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select County</option>
                          <option value="Broward">Broward</option>
                          <option value="Miami-Dade">Miami-Dade</option>
                          <option value="Palm Beach">Palm Beach</option>
                          <option value="St. Lucie">St. Lucie</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          value={formData.zip_code}
                          onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="33166"
                        />
                      </div>
                    </div>

                    {/* Size and Price - Only for Single Properties */}
                    {formData.property_type === 'single' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Square Footage *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              required
                              value={formData.size}
                              onChange={(e) => setFormData({...formData, size: e.target.value})}
                              className="w-full pr-16 py-2 px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="10000"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">sq ft</span>
                          </div>
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
                              required
                              value={formData.price}
                              onChange={(e) => setFormData({...formData, price: e.target.value})}
                              className="w-full pl-8 pr-20 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="8.50"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">/SF/YR</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Multi-Unit Building Note */}
                    {formData.property_type === 'multi_unit' && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          📦 <strong>Multi-Unit Building:</strong> Size and price will be set for each individual unit in the next step.
                        </p>
                      </div>
                    )}

                    <div className="col-span-full">
                      <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Property Images</h4>

                      <ImageDropZone
                        onImagesUploaded={handleImageUpload}
                        isUploading={uploadingImage}
                        galleryImages={galleryImages}
                        featuredImageIndex={featuredImageIndex}
                        onSetFeatured={setFeaturedImage}
                        onRemoveImage={removeGalleryImage}
                      />

                      {/* Manual Image URL Input (fallback) */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Or add image URL manually
                        </label>
                        <input
                          type="url"
                          value={formData.image}
                          onChange={(e) => setFormData({...formData, image: e.target.value})}
                          placeholder="Paste image URL here"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description & Settings Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Description & Settings</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description *
                      </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Property description, features, amenities..."
                    />
                  </div>

                  {/* Property Features */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Property Features
                    </label>

                    {/* Selected Features */}
                    {formData.features.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected features:</p>
                        <div className="flex flex-wrap gap-2">
                          {formData.features.map((feature) => (
                            <span
                              key={feature}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              {feature}
                              <button
                                type="button"
                                onClick={() => removeFeature(feature)}
                                className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Features to Add */}
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Add features:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        {availableFeatures
                          .filter(feature => !formData.features.includes(feature))
                          .map((feature) => (
                            <button
                              key={feature}
                              type="button"
                              onClick={() => addFeature(feature)}
                              className="text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                            >
                              + {feature}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Custom Feature Input */}
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Add custom feature:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customFeature}
                          onChange={(e) => setCustomFeature(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomFeature())}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Enter custom feature (e.g., 'Fiber Optic Ready')"
                        />
                        <button
                          type="button"
                          onClick={addCustomFeature}
                          disabled={!customFeature.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                    <div className="grid grid-cols-1 gap-6">
                      <label className="flex items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.available}
                          onChange={(e) => setFormData({...formData, available: e.target.checked})}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">Available for Lease</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Show as available to prospects</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit Section */}
                <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 -mx-6">
                  <div className="flex gap-4 justify-end">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                    >
                      {editingProperty ? 'Update Property' : 'Create Property'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Properties Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div key={property.id} className="bg-white rounded-lg shadow overflow-hidden">
              {property.image && (
                <img
                  src={property.image}
                  alt={property.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-gray-900">{property.title}</h3>
                  <div className="flex gap-1">
                    {property.featured && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        Featured
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded ${
                      property.available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {property.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Type:</strong> {property.type}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Location:</strong> {property.location}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Size:</strong> {property.size}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Price:</strong> {property.price}
                </p>
                <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                  {property.description}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(property)}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(property.id)}
                    className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {properties.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-4a1 1 0 011-1h2a1 1 0 011 1v4M7 7h10M7 11h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
            <p className="text-gray-600 mb-6">
              Add your first property to get started. Properties you add here will appear on your website.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Add Your First Property
            </button>
          </div>
        )}

      </div>
    </div>
  );
}