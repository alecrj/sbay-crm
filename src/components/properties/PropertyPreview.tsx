"use client";

import React from "react";
import Image from "next/image";
import { Property } from "@/lib/supabase";

interface PropertyPreviewProps {
  formData: Partial<Property>;
}

const PropertyPreview: React.FC<PropertyPreviewProps> = ({ formData }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Live Preview
          </h3>
          <div className="flex gap-2">
            {formData.available && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                Available
              </span>
            )}
            {formData.featured && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Property Image */}
        <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
          {formData.image ? (
            <Image
              src={formData.image}
              alt={formData.title || "Property preview"}
              fill
              className="object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No image uploaded</p>
              </div>
            </div>
          )}
        </div>

        {/* Property Title */}
        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {formData.title || "Property Title"}
        </h4>

        {/* Property Type & Location */}
        <div className="flex items-center gap-4 mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {formData.type ? formData.type.charAt(0).toUpperCase() + formData.type.slice(1).replace('-', ' ') : 'Property Type'}
          </span>
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm">{formData.location || "Location"}, {formData.county || "County"}</span>
          </div>
        </div>

        {/* Key Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Size</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formData.size || "-- sq ft"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formData.price || "Contact for pricing"}
            </p>
          </div>
        </div>

        {/* Additional Details */}
        {(formData.clear_height || formData.loading_docks || formData.parking || formData.year_built) && (
          <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {formData.clear_height && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Clear Height</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.clear_height}</p>
              </div>
            )}
            {formData.loading_docks && formData.loading_docks > 0 && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading Docks</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.loading_docks}</p>
              </div>
            )}
            {formData.parking && formData.parking > 0 && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Parking</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.parking} spaces</p>
              </div>
            )}
            {formData.year_built && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Year Built</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.year_built}</p>
              </div>
            )}
          </div>
        )}

        {/* Features */}
        {formData.features && formData.features.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Features</p>
            <div className="flex flex-wrap gap-2">
              {formData.features.map((feature, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {formData.description && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Description</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {formData.description}
            </p>
          </div>
        )}

        {/* Address */}
        {(formData.street_address || formData.city || formData.zip_code) && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Address</p>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {formData.street_address && <p>{formData.street_address}</p>}
              <p>
                {formData.city && `${formData.city}, `}
                {formData.state || "FL"} {formData.zip_code}
              </p>
            </div>
          </div>
        )}

        {/* Gallery Preview */}
        {formData.gallery && formData.gallery.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Gallery ({formData.gallery.length} images)</p>
            <div className="grid grid-cols-4 gap-2">
              {formData.gallery.slice(0, 4).map((imageUrl, index) => (
                <div key={index} className="w-16 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  <Image
                    src={imageUrl}
                    alt={`Gallery ${index + 1}`}
                    width={64}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {formData.gallery.length > 4 && (
                <div className="w-16 h-12 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-500">+{formData.gallery.length - 4}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyPreview;