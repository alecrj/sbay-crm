'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useUserRole } from '../../../contexts/UserRoleContext';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

interface Property {
  id: string;
  title: string;
  type: string;
  location: string;
  size: string;
  price: string;
  image?: string;
  available: boolean;
  property_type?: string;
  parent_property_id?: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  property_interest?: string;
  property_id?: string;
  consultation_date?: string;
  consultation_time?: string;
  message?: string;
  status: string;
  created_at: string;
}

export default function PropertyLeadsPage() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, roleLoading, router]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load all properties (parent buildings and standalone)
      const { data: propertiesData, error: propError } = await supabase
        .from('properties')
        .select('*')
        .order('title', { ascending: true });

      if (propError) throw propError;

      // Load all leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      setProperties(propertiesData || []);
      setLeads(leadsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (propertyId: string) => {
    const newExpanded = new Set(expandedProperties);
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId);
    } else {
      newExpanded.add(propertyId);
    }
    setExpandedProperties(newExpanded);
  };

  const getLeadsForProperty = (property: Property): Lead[] => {
    return leads.filter(lead => {
      // Match by property_id
      if (lead.property_id === property.id) return true;
      // Match by property_interest (title match)
      if (lead.property_interest && property.title &&
          lead.property_interest.toLowerCase().includes(property.title.toLowerCase())) {
        return true;
      }
      return false;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'contacted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'no-reply': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'showing-completed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'won': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'lost': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Filter properties based on search term
  const filteredProperties = properties.filter(property => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      property.title?.toLowerCase().includes(search) ||
      property.location?.toLowerCase().includes(search)
    );
  });

  // Separate parent/standalone properties from units
  const parentProperties = filteredProperties.filter(p => !p.parent_property_id);
  const getUnits = (parentId: string) => filteredProperties.filter(p => p.parent_property_id === parentId);

  // Calculate total leads per property (including units)
  const getTotalLeadsCount = (property: Property): number => {
    let count = getLeadsForProperty(property).length;
    if (property.property_type === 'multi_unit') {
      const units = getUnits(property.id);
      units.forEach(unit => {
        count += getLeadsForProperty(unit).length;
      });
    }
    return count;
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
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Property Leads
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                View leads organized by property interest
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {leads.length} total leads
              </div>
            </div>
          </div>
        </div>

        {/* Properties with Leads */}
        <div className="space-y-4">
          {parentProperties.map((property) => {
            const propertyLeads = getLeadsForProperty(property);
            const units = property.property_type === 'multi_unit' ? getUnits(property.id) : [];
            const totalLeads = getTotalLeadsCount(property);
            const isExpanded = expandedProperties.has(property.id);

            return (
              <div key={property.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {/* Property Header */}
                <div
                  onClick={() => toggleExpand(property.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Property Image */}
                    {property.image && (
                      <img
                        src={property.image}
                        alt={property.title}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    {!property.image && (
                      <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-4a1 1 0 011-1h2a1 1 0 011 1v4" />
                        </svg>
                      </div>
                    )}

                    {/* Property Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {property.title}
                        </h3>
                        {property.property_type === 'multi_unit' && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                            {units.length} Units
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {property.location} • {property.size}
                      </p>
                    </div>

                    {/* Lead Count Badge */}
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        totalLeads > 0
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {totalLeads} {totalLeads === 1 ? 'lead' : 'leads'}
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    {/* Direct Property Leads */}
                    {propertyLeads.length > 0 && (
                      <div className="p-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Interested Leads
                        </h4>
                        <div className="space-y-3">
                          {propertyLeads.map((lead) => (
                            <div
                              key={lead.id}
                              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                            >
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {lead.name}
                                    </span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(lead.status)}`}>
                                      {lead.status}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                                    <a href={`mailto:${lead.email}`} className="hover:text-blue-600">
                                      {lead.email}
                                    </a>
                                    {lead.phone && (
                                      <a href={`tel:${lead.phone}`} className="hover:text-blue-600">
                                        {lead.phone}
                                      </a>
                                    )}
                                    {lead.company && (
                                      <span>{lead.company}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 text-sm">
                                  {(lead.consultation_date || lead.consultation_time) && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-lg">
                                      <span className="font-medium">Preferred: </span>
                                      {lead.consultation_date && formatDate(lead.consultation_date)}
                                      {lead.consultation_time && ` • ${lead.consultation_time}`}
                                    </div>
                                  )}
                                  <span className="text-gray-400 text-xs">
                                    Submitted {formatDate(lead.created_at)}
                                  </span>
                                </div>
                              </div>
                              {lead.message && (
                                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600">
                                  "{lead.message}"
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Units (for multi-unit buildings) */}
                    {units.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Individual Units
                        </h4>
                        <div className="space-y-3">
                          {units.map((unit) => {
                            const unitLeads = getLeadsForProperty(unit);
                            return (
                              <div key={unit.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {unit.title}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                      {unit.size} • {unit.price}
                                    </span>
                                  </div>
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    unitLeads.length > 0
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                      : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                                  }`}>
                                    {unitLeads.length} leads
                                  </span>
                                </div>
                                {unitLeads.length > 0 && (
                                  <div className="space-y-2 mt-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                                    {unitLeads.map((lead) => (
                                      <div key={lead.id} className="text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-800 dark:text-gray-200">
                                            {lead.name}
                                          </span>
                                          <span className={`px-1.5 py-0.5 text-xs rounded ${getStatusColor(lead.status)}`}>
                                            {lead.status}
                                          </span>
                                        </div>
                                        <div className="text-gray-600 dark:text-gray-400">
                                          {lead.email} {lead.phone && `• ${lead.phone}`}
                                        </div>
                                        {(lead.consultation_date || lead.consultation_time) && (
                                          <div className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
                                            Preferred: {lead.consultation_date && formatDate(lead.consultation_date)}
                                            {lead.consultation_time && ` • ${lead.consultation_time}`}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* No Leads Message */}
                    {propertyLeads.length === 0 && units.every(u => getLeadsForProperty(u).length === 0) && (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p>No leads for this property yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {parentProperties.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-4a1 1 0 011-1h2a1 1 0 011 1v4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No properties found' : 'No properties yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Add properties in the Properties section to see leads organized by property'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
