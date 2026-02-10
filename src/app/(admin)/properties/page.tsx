'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useUserRole } from '../../../contexts/UserRoleContext';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import ImageDropZone from '../../../components/properties/ImageDropZone';
import { uploadPropertyImages } from '../../../lib/image-upload';

interface Property {
  id: string;
  title: string;
  type: string;
  property_type?: string;
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
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [propertyUnits, setPropertyUnits] = useState<Record<string, any[]>>({});
  const [counties, setCounties] = useState<Array<{ id: string; name: string }>>([]);

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

  // State for units (when property_type is 'multi_unit')
  const [units, setUnits] = useState<Array<{
    id?: string;
    title: string;
    size: string;
    price: string;
    description: string;
    available: boolean;
    features: string[];
    image: string;
    gallery: string[];
    galleryImages: string[]; // For tracking uploaded images
    featuredImageIndex: number; // For tracking which image is featured
    uploadingImage: boolean; // For tracking upload state
  }>>([]);

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

  // Unit management functions
  const addUnit = () => {
    setUnits([...units, {
      title: '',
      size: '',
      price: '',
      description: '',
      available: true,
      features: [],
      image: '',
      gallery: [],
      galleryImages: [],
      featuredImageIndex: 0,
      uploadingImage: false
    }]);
  };

  const removeUnit = (index: number) => {
    setUnits(units.filter((_, i) => i !== index));
  };

  const updateUnit = (index: number, field: string, value: any) => {
    const newUnits = [...units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setUnits(newUnits);
  };

  // Helper functions for main property features
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

  // Helper functions for unit features
  const addUnitFeature = (unitIndex: number, feature: string) => {
    const newUnits = [...units];
    if (!newUnits[unitIndex].features.includes(feature)) {
      newUnits[unitIndex].features = [...newUnits[unitIndex].features, feature];
      setUnits(newUnits);
    }
  };

  const removeUnitFeature = (unitIndex: number, feature: string) => {
    const newUnits = [...units];
    newUnits[unitIndex].features = newUnits[unitIndex].features.filter(f => f !== feature);
    setUnits(newUnits);
  };

  // Unit image upload handlers
  const handleUnitImageUpload = async (unitIndex: number, files: File[]) => {
    if (!files || files.length === 0) {
      console.log(`⚠️ handleUnitImageUpload called for unit ${unitIndex} with no files`);
      return;
    }

    console.log(`🖼️ UNIT ${unitIndex} IMAGE UPLOAD STARTED`);
    console.log(`Unit title: ${units[unitIndex]?.title}`);
    console.log(`Files to upload: ${files.length}`);
    console.log(`Current unit gallery size: ${units[unitIndex]?.galleryImages?.length || 0}`);

    // Set uploading state for this unit
    const newUnits = [...units];
    newUnits[unitIndex].uploadingImage = true;
    setUnits(newUnits);

    try {
      // Use the universal image upload utility with optimization
      console.log(`📤 Calling uploadPropertyImages for unit ${unitIndex}...`);
      const uploadedUrls = await uploadPropertyImages(files);

      console.log(`✅ Unit ${unitIndex} images uploaded successfully:`, uploadedUrls);

      if (uploadedUrls.length > 0) {
        const updatedUnits = [...units];
        const currentGallery = updatedUnits[unitIndex].galleryImages || [];
        updatedUnits[unitIndex].galleryImages = [...currentGallery, ...uploadedUrls];
        updatedUnits[unitIndex].gallery = [...currentGallery, ...uploadedUrls];

        // Set first image as featured if none set
        if (updatedUnits[unitIndex].galleryImages.length === uploadedUrls.length) {
          updatedUnits[unitIndex].image = uploadedUrls[0];
          updatedUnits[unitIndex].featuredImageIndex = 0;
        }

        updatedUnits[unitIndex].uploadingImage = false;
        setUnits(updatedUnits);
        console.log(`Unit ${unitIndex} images updated. Total gallery:`, updatedUnits[unitIndex].galleryImages.length);
      }
    } catch (error) {
      console.error('Error uploading unit images:', error);
      const updatedUnits = [...units];
      updatedUnits[unitIndex].uploadingImage = false;
      setUnits(updatedUnits);
      // Show error to user
      alert(`Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const setUnitFeaturedImage = (unitIndex: number, imageUrl: string, index: number) => {
    const newUnits = [...units];
    newUnits[unitIndex].image = imageUrl;
    newUnits[unitIndex].featuredImageIndex = index;
    setUnits(newUnits);
    console.log(`Unit ${unitIndex} featured image set to index ${index}:`, imageUrl);
  };

  const removeUnitGalleryImage = (unitIndex: number, imageIndex: number) => {
    const newUnits = [...units];
    const updatedGallery = newUnits[unitIndex].galleryImages.filter((_, i) => i !== imageIndex);
    newUnits[unitIndex].galleryImages = updatedGallery;
    newUnits[unitIndex].gallery = updatedGallery;

    // Update featured image if necessary
    if (imageIndex === newUnits[unitIndex].featuredImageIndex) {
      newUnits[unitIndex].featuredImageIndex = 0;
      newUnits[unitIndex].image = updatedGallery[0] || '';
    } else if (imageIndex < newUnits[unitIndex].featuredImageIndex) {
      newUnits[unitIndex].featuredImageIndex -= 1;
    }

    setUnits(newUnits);
    console.log(`Unit ${unitIndex} image removed. Remaining:`, updatedGallery.length);
  };

  const handleImageUpload = async (files: File[]) => {
    if (!files || files.length === 0) {
      console.log('⚠️ handleImageUpload called with no files');
      return;
    }

    console.log('🖼️ MAIN PROPERTY IMAGE UPLOAD STARTED');
    console.log('Property type:', formData.property_type);
    console.log('Files to upload:', files.length);
    console.log('Current gallery size:', galleryImages.length);

    setUploadingImage(true);

    try {
      // Use the universal image upload utility with optimization
      console.log('📤 Calling uploadPropertyImages...');
      const uploadedUrls = await uploadPropertyImages(files);

      console.log('✅ All uploads completed:', uploadedUrls);

      // Add new images to gallery and form data
      const newGallery = [...galleryImages, ...uploadedUrls];
      console.log('📝 Updating gallery state:', newGallery);
      setGalleryImages(newGallery);
      setFormData(prev => ({ ...prev, gallery: newGallery }));

      // Set first uploaded image as featured if no featured image exists
      if (galleryImages.length === 0 && uploadedUrls.length > 0) {
        console.log('⭐ Setting featured image:', uploadedUrls[0]);
        setFormData(prev => ({ ...prev, image: uploadedUrls[0] }));
        setFeaturedImageIndex(0);
      }

      // Show success message
      alert(`Successfully uploaded ${uploadedUrls.length} image(s)!`);

    } catch (error: any) {
      console.error('❌ Error uploading images:', error);
      alert(`Error uploading images: ${error.message}`);
    } finally {
      setUploadingImage(false);
      console.log('🏁 Upload process finished');
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
    loadCounties();
  }, []);

  const loadCounties = async () => {
    try {
      console.log('🏛️ Loading counties from database...');
      const { data, error } = await supabase
        .from('counties')
        .select('id, name')
        .eq('active', true)
        .order('name');

      console.log('🏛️ Counties response:', { data, error });

      if (error) {
        console.error('❌ Error fetching counties:', error);
        // Fallback to hardcoded list
        const fallbackCounties = [
          { id: '1', name: 'Broward' },
          { id: '2', name: 'Miami-Dade' },
          { id: '3', name: 'Palm Beach' },
          { id: '4', name: 'St. Lucie' },
        ];
        console.log('🏛️ Using fallback counties:', fallbackCounties);
        setCounties(fallbackCounties);
      } else {
        console.log('✅ Successfully loaded counties from DB:', data);
        setCounties(data || []);
      }
    } catch (err) {
      console.error('❌ Error loading counties:', err);
      // Fallback to hardcoded list
      const fallbackCounties = [
        { id: '1', name: 'Broward' },
        { id: '2', name: 'Miami-Dade' },
        { id: '3', name: 'Palm Beach' },
        { id: '4', name: 'St. Lucie' },
      ];
      console.log('🏛️ Using fallback counties:', fallbackCounties);
      setCounties(fallbackCounties);
    }
  };

  const togglePropertyExpand = async (propertyId: string, propertyType: string) => {
    const newExpanded = new Set(expandedProperties);

    if (newExpanded.has(propertyId)) {
      // Collapse
      newExpanded.delete(propertyId);
      setExpandedProperties(newExpanded);
    } else {
      // Expand - load units if multi-unit and not already loaded
      newExpanded.add(propertyId);
      setExpandedProperties(newExpanded);

      if (propertyType === 'multi_unit' && !propertyUnits[propertyId]) {
        try {
          // Use API endpoint which uses service role
          const response = await fetch('/api/properties');
          const result = await response.json();

          if (response.ok && result.properties) {
            const units = result.properties.filter(
              (p: any) => p.parent_property_id === propertyId
            );
            setPropertyUnits(prev => ({ ...prev, [propertyId]: units || [] }));
          }
        } catch (error) {
          console.error('Error fetching units:', error);
        }
      }
    }
  };

  const handleDeleteUnit = async (unitId: string, parentPropertyId: string) => {
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

      // Refresh the units for this property via API
      const refreshResponse = await fetch('/api/properties');
      const refreshResult = await refreshResponse.json();

      if (refreshResponse.ok && refreshResult.properties) {
        const updatedUnits = refreshResult.properties.filter(
          (p: any) => p.parent_property_id === parentPropertyId
        );
        setPropertyUnits(prev => ({ ...prev, [parentPropertyId]: updatedUnits || [] }));
      }
    } catch (error) {
      console.error('Error deleting unit:', error);
      alert(`Failed to delete unit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadProperties = async () => {
    try {
      // Use API endpoint which uses service role (no token expiration issues)
      const response = await fetch('/api/properties');
      const result = await response.json();

      if (!response.ok) {
        console.error('API error loading properties:', result.error);
        throw new Error(result.error);
      }

      // Filter to only show parent buildings and standalone properties (not individual units)
      const parentProperties = (result.properties || []).filter(
        (p: any) => !p.parent_property_id
      );

      setProperties(parentProperties);
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
        price: `$${formData.price}/month`,
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

        // If this is a multi-unit property, create any NEW units (ones without an id)
        if (formData.property_type === 'multi_unit' && units.length > 0) {
          const newUnits = units.filter(unit => !unit.id); // Only units without an id are new

          if (newUnits.length > 0) {
            console.log(`➕ Creating ${newUnits.length} new units...`);

            for (const unit of newUnits) {
              console.log(`📸 Unit "${unit.title}" images:`, {
                image: unit.image,
                galleryCount: unit.gallery?.length || 0,
                gallery: unit.gallery
              });

              const unitData = {
                title: `${formData.title} - ${unit.title}`,
                type: formData.type,
                property_type: 'single',
                parent_property_id: editingProperty.id,
                street_address: formData.street_address,
                city: formData.city,
                county: formData.county,
                zip_code: formData.zip_code,
                location: formData.city ? `${formData.city}${formData.county ? ', ' + formData.county : ''}, FL` : '',
                size: `${unit.size} sq ft`,
                price: `$${unit.price}/month`,
                description: unit.description,
                available: unit.available,
                features: unit.features,
                image: unit.image,
                gallery: unit.gallery
              };

              const unitResponse = await fetch('/api/properties', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(unitData)
              });

              if (!unitResponse.ok) {
                console.error(`Failed to create unit: ${unit.title}`);
              } else {
                console.log(`✅ Unit created: ${unit.title}`);
              }
            }

            alert(`Added ${newUnits.length} new unit(s) to the building!`);
          }
        }
      } else {
        console.log('➕ Creating new property...');

        // For multi-unit properties, don't include size/price (units will have those)
        const parentPropertyData = formData.property_type === 'multi_unit'
          ? { ...propertyData, size: '', price: '' }
          : propertyData;

        const response = await fetch('/api/properties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(parentPropertyData)
        });

        const result = await response.json();
        console.log('🔥 API response:', { status: response.status, result });

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create property');
        }

        console.log('✅ Property created successfully');

        // If this is a multi-unit property, create all units
        if (formData.property_type === 'multi_unit' && result.property?.id && units.length > 0) {
          console.log(`➕ Creating ${units.length} units...`);

          for (const unit of units) {
            console.log(`📸 Unit "${unit.title}" images:`, {
              image: unit.image,
              galleryCount: unit.gallery?.length || 0,
              gallery: unit.gallery
            });

            const unitData = {
              title: `${formData.title} - ${unit.title}`,
              type: formData.type,
              property_type: 'single',
              parent_property_id: result.property.id,
              street_address: formData.street_address,
              city: formData.city,
              county: formData.county,
              zip_code: formData.zip_code,
              location: formData.city ? `${formData.city}${formData.county ? ', ' + formData.county : ''}, FL` : '',
              size: `${unit.size} sq ft`,
              price: `$${unit.price}/month`,
              description: unit.description,
              available: unit.available,
              features: unit.features,
              image: unit.image,
              gallery: unit.gallery
            };

            const unitResponse = await fetch('/api/properties', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(unitData)
            });

            if (!unitResponse.ok) {
              console.error(`Failed to create unit: ${unit.title}`);
            } else {
              console.log(`✅ Unit created: ${unit.title}`);
            }
          }

          alert(`Multi-unit building created with ${units.length} units!`);
        }
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

  const handleEdit = async (property: any) => {
    setEditingProperty(property);
    const galleryArray = Array.isArray(property.gallery) ? property.gallery : [];
    setFormData({
      title: property.title,
      type: property.type,
      property_type: property.property_type || 'single',
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

    // If this is a multi-unit property, fetch its existing units
    if (property.property_type === 'multi_unit') {
      console.log('📦 Loading existing units for property:', property.id);
      try {
        // Use API endpoint which uses service role
        const response = await fetch('/api/properties');
        const result = await response.json();

        const existingUnits = response.ok && result.properties
          ? result.properties.filter((p: any) => p.parent_property_id === property.id)
          : [];

        if (existingUnits && existingUnits.length > 0) {
          console.log(`✅ Loaded ${existingUnits.length} existing units`);

          // Convert existing units to the format expected by the form
          const formattedUnits = existingUnits.map(unit => ({
            id: unit.id, // Include the ID so we know it's an existing unit
            title: unit.title.replace(`${property.title} - `, ''), // Remove parent title prefix
            size: unit.size ? unit.size.replace(/[^\d]/g, '') : '',
            price: unit.price ? unit.price.replace(/[^\d.]/g, '') : '',
            description: unit.description || '',
            available: unit.available,
            features: unit.features || [],
            image: unit.image || '',
            gallery: Array.isArray(unit.gallery) ? unit.gallery : [],
            galleryImages: Array.isArray(unit.gallery) ? unit.gallery : [],
            featuredImageIndex: 0,
            uploadingImage: false
          }));

          setUnits(formattedUnits);
        }
      } catch (error) {
        console.error('Error fetching units:', error);
      }
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
      gallery: [],
      features: []
    });
    setGalleryImages([]);
    setFeaturedImageIndex(0);
    setEditingProperty(null);
    setShowForm(false);
    setCustomFeature('');
    setUnits([]);
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                🏢 Property Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
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
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-50">
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
                        <option value="single">Single Property</option>
                        <option value="multi_unit">Multi-Unit Building</option>
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
                          {counties.map((county) => (
                            <option key={county.id} value={county.name}>
                              {county.name}
                            </option>
                          ))}
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
                            Monthly Lease Rate *
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
                              placeholder="5000"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">/month</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Multi-Unit Building - Units Section */}
                    {formData.property_type === 'multi_unit' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                            📦 <strong>Multi-Unit Building</strong> - Add individual units below
                          </p>
                        </div>

                        {/* Units List */}
                        {units.map((unit, index) => (
                          <div key={index} className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-md font-semibold text-gray-900 dark:text-white">Unit {index + 1}</h4>
                              <button
                                type="button"
                                onClick={() => removeUnit(index)}
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Unit Name */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Unit Name/Number *
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={unit.title}
                                  onChange={(e) => updateUnit(index, 'title', e.target.value)}
                                  placeholder="Unit A, Suite 101, etc."
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Unit Size */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Square Footage *
                                </label>
                                <input
                                  type="number"
                                  required
                                  value={unit.size}
                                  onChange={(e) => updateUnit(index, 'size', e.target.value)}
                                  placeholder="5000"
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Unit Price */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Monthly Lease Rate *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  required
                                  value={unit.price}
                                  onChange={(e) => updateUnit(index, 'price', e.target.value)}
                                  placeholder="5000"
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              {/* Unit Available */}
                              <div className="flex items-center pt-6">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={unit.available}
                                    onChange={(e) => updateUnit(index, 'available', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                                  />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Available for Lease
                                  </span>
                                </label>
                              </div>
                            </div>

                            {/* Unit Description */}
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Unit Description (optional)
                              </label>
                              <textarea
                                value={unit.description}
                                onChange={(e) => updateUnit(index, 'description', e.target.value)}
                                rows={2}
                                placeholder="Unit-specific details..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Unit Images */}
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Unit Images
                              </label>
                              <ImageDropZone
                                onImagesUploaded={(files) => handleUnitImageUpload(index, files)}
                                isUploading={unit.uploadingImage || false}
                                galleryImages={unit.galleryImages || []}
                                featuredImageIndex={unit.featuredImageIndex || 0}
                                onSetFeatured={(imageUrl, imgIndex) => setUnitFeaturedImage(index, imageUrl, imgIndex)}
                                onRemoveImage={(imgIndex) => removeUnitGalleryImage(index, imgIndex)}
                              />
                            </div>

                            {/* Unit Features */}
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Unit Features
                              </label>

                              {/* Selected Features */}
                              {unit.features.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Selected:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {unit.features.map((feature) => (
                                      <span
                                        key={feature}
                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                      >
                                        {feature}
                                        <button
                                          type="button"
                                          onClick={() => removeUnitFeature(index, feature)}
                                          className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
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
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Add features:</p>
                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                                  {availableFeatures
                                    .filter(feature => !unit.features.includes(feature))
                                    .map((feature) => (
                                      <button
                                        key={feature}
                                        type="button"
                                        onClick={() => addUnitFeature(index, feature)}
                                        className="text-left px-2 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                                      >
                                        + {feature}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add Unit Button */}
                        <button
                          type="button"
                          onClick={addUnit}
                          className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                        >
                          + Add Unit
                        </button>
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
          {properties.map((property) => {
            const isMultiUnit = property.property_type === 'multi_unit';
            const isExpanded = expandedProperties.has(property.id);
            const units = propertyUnits[property.id] || [];

            return (
              <div key={property.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {property.image && (
                  <img
                    src={property.image}
                    alt={property.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{property.title}</h3>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {isMultiUnit && (
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded whitespace-nowrap">
                          {units.length > 0 ? `${units.length} Units` : 'Multi-Unit'}
                        </span>
                      )}
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <strong>Type:</strong> {property.type}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <strong>Location:</strong> {property.location}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <strong>Size:</strong> {property.size}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <strong>Price:</strong> {property.price}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                    {property.description}
                  </p>

                  {/* Units Section for Multi-Unit Properties */}
                  {isMultiUnit && isExpanded && (
                    <div className="mb-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">Units:</h4>
                      {units.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {units.map((unit, index) => (
                            <div key={unit.id} className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 dark:text-white">{unit.title}</div>
                                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                                    {unit.size} • {unit.price}
                                    {unit.available ?
                                      <span className="ml-2 text-green-600 dark:text-green-400">Available</span> :
                                      <span className="ml-2 text-red-600 dark:text-red-400">Unavailable</span>
                                    }
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUnit(unit.id, property.id);
                                  }}
                                  className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors flex items-center gap-1"
                                  title="Delete unit"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No units added yet</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {isMultiUnit && (
                      <button
                        onClick={() => togglePropertyExpand(property.id, property.property_type || 'single')}
                        className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded text-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Hide
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            View Units
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(property)}
                      className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(property.id)}
                      className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded text-sm hover:bg-red-200 dark:hover:bg-red-900/50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {properties.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-4a1 1 0 011-1h2a1 1 0 011 1v4M7 7h10M7 11h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No properties yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
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