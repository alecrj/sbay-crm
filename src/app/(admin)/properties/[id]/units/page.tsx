'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ImageDropZone from '@/components/properties/ImageDropZone';
import { uploadPropertyImages } from '@/lib/image-upload';

interface Property {
  id: string;
  title: string;
  street_address: string;
  city: string;
  county: string;
  zip_code: string;
  property_type: string;
}

interface Unit {
  id: string;
  title: string;
  size: string;
  price: string;
  available: boolean;
  features: string[];
  image: string;
  gallery: string[];
}

export default function ManageUnitsPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [parentProperty, setParentProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const [unitFormData, setUnitFormData] = useState({
    title: '',
    type: 'warehouse' as 'warehouse' | 'office' | 'industrial' | 'flex-space' | 'distribution',
    size: '',
    price: '',
    description: '',
    available: true,
    features: [] as string[],
    image: '',
    gallery: [] as string[]
  });

  // Image gallery state
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [featuredImageIndex, setFeaturedImageIndex] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Load parent property and its units
  useEffect(() => {
    loadData();
  }, [propertyId]);

  const loadData = async () => {
    try {
      // Load parent property
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (propError) throw propError;

      // Verify it's a multi-unit property
      if (property.property_type !== 'multi_unit') {
        alert('This is not a multi-unit property');
        router.push('/properties');
        return;
      }

      setParentProperty(property);

      // Load units (child properties)
      const { data: unitsData, error: unitsError } = await supabase
        .from('properties')
        .select('*')
        .eq('parent_property_id', propertyId)
        .order('title');

      if (unitsError) throw unitsError;
      setUnits(unitsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load property data');
    } finally {
      setLoading(false);
    }
  };

  // Image upload handlers
  const handleImageUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    console.log('Starting image upload for', files.length, 'files');
    setUploadingImage(true);

    try {
      // Use the universal image upload utility with optimization
      const uploadedUrls = await uploadPropertyImages(files);

      console.log('All uploads completed:', uploadedUrls);

      // Add new images to gallery
      const newGallery = [...galleryImages, ...uploadedUrls];
      setGalleryImages(newGallery);
      setUnitFormData(prev => ({ ...prev, gallery: newGallery }));

      // Set first uploaded image as featured if no featured image exists
      if (galleryImages.length === 0 && uploadedUrls.length > 0) {
        setUnitFormData(prev => ({ ...prev, image: uploadedUrls[0] }));
        setFeaturedImageIndex(0);
      }

      alert(`Successfully uploaded ${uploadedUrls.length} image(s)!`);

    } catch (error: any) {
      console.error('Error uploading images:', error);
      alert(`Error uploading images: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const setFeaturedImage = (imageUrl: string, index: number) => {
    setUnitFormData(prev => ({ ...prev, image: imageUrl }));
    setFeaturedImageIndex(index);
  };

  const removeGalleryImage = (index: number) => {
    const newGallery = galleryImages.filter((_, i) => i !== index);
    setGalleryImages(newGallery);
    setUnitFormData(prev => ({ ...prev, gallery: newGallery }));

    // If removed image was featured, set new featured image
    if (index === featuredImageIndex) {
      setFeaturedImageIndex(0);
      setUnitFormData(prev => ({ ...prev, image: newGallery[0] || '' }));
    } else if (index < featuredImageIndex) {
      setFeaturedImageIndex(featuredImageIndex - 1);
    }
  };

  const handleAddUnit = () => {
    setEditingUnit(null);
    setUnitFormData({
      title: '',
      type: parentProperty?.type || 'warehouse',
      size: '',
      price: '',
      description: '',
      available: true,
      features: [],
      image: '',
      gallery: []
    });
    setGalleryImages([]);
    setFeaturedImageIndex(0);
    setShowUnitForm(true);
  };

  const handleEditUnit = (unit: any) => {
    setEditingUnit(unit);
    const unitGallery = unit.gallery || [];
    setUnitFormData({
      title: unit.title,
      type: unit.type || 'warehouse',
      size: unit.size?.replace(' sq ft', '') || '',
      price: unit.price?.replace(/[$\/SF\/YR]/g, '') || '',
      description: unit.description || '',
      available: unit.available,
      features: unit.features || [],
      image: unit.image || '',
      gallery: unitGallery
    });
    setGalleryImages(unitGallery);
    // Find featured image index
    const featuredIndex = unitGallery.findIndex((img: string) => img === unit.image);
    setFeaturedImageIndex(featuredIndex >= 0 ? featuredIndex : 0);
    setShowUnitForm(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!parentProperty) return;

    try {
      const unitData = {
        ...unitFormData,
        // Inherit parent property address
        street_address: parentProperty.street_address,
        city: parentProperty.city,
        county: parentProperty.county,
        zip_code: parentProperty.zip_code,
        state: 'FL',
        location: `${parentProperty.city}, ${parentProperty.county}, FL`,
        // Format fields
        size: `${unitFormData.size} sq ft`,
        price: `$${unitFormData.price}/SF/YR`,
        // Set as single property type (units are like single properties)
        property_type: 'single',
        // Link to parent
        parent_property_id: propertyId,
        // Use unit's own type (not parent's)
        type: unitFormData.type
      };

      if (editingUnit) {
        // Update existing unit via API
        const response = await fetch(`/api/properties?id=${editingUnit.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(unitData)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update unit');
        }
      } else {
        // Create new unit via API
        const response = await fetch('/api/properties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(unitData)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create unit');
        }
      }

      // Reload units
      await loadData();
      setShowUnitForm(false);
    } catch (error) {
      console.error('Error saving unit:', error);
      alert(`Failed to save unit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    try {
      console.log('🗑️ Deleting unit via API...');

      const response = await fetch(`/api/properties?id=${unitId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      console.log('🔥 Delete unit API response:', { status: response.status, result });

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete unit');
      }

      console.log('✅ Unit deleted successfully via API');
      await loadData();
    } catch (error) {
      console.error('Error deleting unit:', error);
      alert(`Failed to delete unit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!parentProperty) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Property not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/properties')}
                className="text-sm text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1"
              >
                ← Back to Properties
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Manage Units
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {parentProperty.title} • {parentProperty.street_address}
              </p>
            </div>
            <button
              onClick={handleAddUnit}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              + Add Unit
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Units List */}
        {units.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No units yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add individual units to this building. Each unit will have its own listing page and booking calendar.
            </p>
            <button
              onClick={handleAddUnit}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Add First Unit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {units.map((unit) => (
              <div
                key={unit.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Unit Image */}
                {unit.image && (
                  <img
                    src={unit.image}
                    alt={unit.title}
                    className="w-full h-48 object-cover"
                  />
                )}

                {/* Unit Info */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {unit.title}
                      </h3>
                      <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>{unit.size}</span>
                        <span>{unit.price}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        unit.available
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {unit.available ? 'Available' : 'Leased'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditUnit(unit)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUnit(unit.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Unit Modal */}
      {showUnitForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingUnit ? 'Edit Unit' : 'Add New Unit'}
              </h2>
            </div>

            <form onSubmit={handleSaveUnit} className="p-6 space-y-6">
              {/* Unit Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit Name/Number *
                </label>
                <input
                  type="text"
                  required
                  value={unitFormData.title}
                  onChange={(e) => setUnitFormData({ ...unitFormData, title: e.target.value })}
                  placeholder="Unit A, Suite 101, etc."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Property Type *
                </label>
                <select
                  required
                  value={unitFormData.type}
                  onChange={(e) => setUnitFormData({ ...unitFormData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="warehouse">Warehouse</option>
                  <option value="office">Office</option>
                  <option value="industrial">Industrial</option>
                  <option value="flex-space">Flex Space</option>
                  <option value="distribution">Distribution</option>
                </select>
              </div>

              {/* Size and Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Square Footage *
                  </label>
                  <input
                    type="number"
                    required
                    value={unitFormData.size}
                    onChange={(e) => setUnitFormData({ ...unitFormData, size: e.target.value })}
                    placeholder="5000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price per SF/YR *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitFormData.price}
                    onChange={(e) => setUnitFormData({ ...unitFormData, price: e.target.value })}
                    placeholder="8.50"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={unitFormData.description}
                  onChange={(e) => setUnitFormData({ ...unitFormData, description: e.target.value })}
                  rows={4}
                  placeholder="Unit-specific details..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit Images
                </label>
                <ImageDropZone
                  onImagesUploaded={handleImageUpload}
                  galleryImages={galleryImages}
                  featuredImageIndex={featuredImageIndex}
                  onSetFeatured={setFeaturedImage}
                  onRemoveImage={removeGalleryImage}
                  isUploading={uploadingImage}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Images will be automatically optimized for web display
                </p>
              </div>

              {/* Image URL (Optional - for external images) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={unitFormData.image}
                  onChange={(e) => setUnitFormData({ ...unitFormData, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Or enter a direct link to use an external image
                </p>
              </div>

              {/* Available Checkbox */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={unitFormData.available}
                    onChange={(e) => setUnitFormData({ ...unitFormData, available: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Available for Lease
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowUnitForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  {editingUnit ? 'Update Unit' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
