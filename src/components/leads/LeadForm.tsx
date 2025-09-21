"use client";

import React, { useState, useEffect } from "react";
import { supabase, Lead } from "@/lib/supabase";
import { scheduleLeadNotification } from "@/lib/notification-scheduler";

interface LeadFormProps {
  lead?: Lead | null;
  onSave: () => void;
  onCancel: () => void;
}

const LeadForm: React.FC<LeadFormProps> = ({ lead, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    type: "general-inquiry" as Lead['type'],
    status: "new" as Lead['status'],
    priority: "medium" as Lead['priority'],
    name: "",
    email: "",
    phone: "",
    company: "",
    property_interest: "",
    space_requirements: "",
    budget: "",
    timeline: "",
    message: "",
    source: "website" as Lead['source'],
    consultation_date: "",
    consultation_time: "",
    follow_up_date: "",
    internal_notes: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        title: lead.title || "",
        type: lead.type || "general-inquiry",
        status: lead.status || "new",
        priority: lead.priority || "medium",
        name: lead.name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        company: lead.company || "",
        property_interest: lead.property_interest || "",
        space_requirements: lead.space_requirements || "",
        budget: lead.budget || "",
        timeline: lead.timeline || "",
        message: lead.message || "",
        source: lead.source || "website",
        consultation_date: lead.consultation_date ? new Date(lead.consultation_date).toISOString().split('T')[0] : "",
        consultation_time: lead.consultation_time || "",
        follow_up_date: lead.follow_up_date ? new Date(lead.follow_up_date).toISOString().split('T')[0] : "",
        internal_notes: lead.internal_notes || "",
      });
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const leadData = {
        ...formData,
        title: formData.title || `${formData.type.replace('-', ' ')} - ${formData.name}`,
        consultation_date: formData.consultation_date || null,
        follow_up_date: formData.follow_up_date || null,
      };

      if (lead?.id) {
        // Update existing lead
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', lead.id);

        if (error) throw error;

        // Log activity
        await supabase
          .from('lead_activities')
          .insert([{
            lead_id: lead.id,
            activity_type: 'note',
            title: 'Lead updated',
            description: 'Lead information was updated',
            metadata: { updated_fields: Object.keys(leadData) }
          }]);

      } else {
        // Create new lead
        const { data: newLead, error } = await supabase
          .from('leads')
          .insert([leadData])
          .select()
          .single();

        if (error) throw error;

        // Log initial activity
        if (newLead) {
          await supabase
            .from('lead_activities')
            .insert([{
              lead_id: newLead.id,
              activity_type: 'note',
              title: 'Lead created',
              description: `New lead created from ${formData.source}`,
              metadata: { source: formData.source, type: formData.type }
            }]);

          // Schedule notification for new lead
          await scheduleLeadNotification(newLead.id, {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company,
            source: formData.source,
            priority: formData.priority,
          });
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Error saving lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {lead ? 'Edit Lead' : 'Add New Lead'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Fill in the lead information below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="(xxx) xxx-xxxx"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="Company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lead Type *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="consultation">Consultation</option>
              <option value="property-inquiry">Property Inquiry</option>
              <option value="general-inquiry">General Inquiry</option>
              <option value="contact-form">Contact Form</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lead Source *
            </label>
            <select
              name="source"
              value={formData.source}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="website">Website</option>
              <option value="referral">Referral</option>
              <option value="cold-call">Cold Call</option>
              <option value="email-campaign">Email Campaign</option>
              <option value="social-media">Social Media</option>
              <option value="trade-show">Trade Show</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal-sent">Proposal Sent</option>
              <option value="closed-won">Closed Won</option>
              <option value="closed-lost">Closed Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Property Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Property Requirements</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Property Interest
            </label>
            <input
              type="text"
              name="property_interest"
              value={formData.property_interest}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="e.g., Warehouse in Doral area"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Space Requirements
            </label>
            <textarea
              name="space_requirements"
              value={formData.space_requirements}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="Describe space requirements..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Budget Range
              </label>
              <input
                type="text"
                name="budget"
                value={formData.budget}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="e.g., $100,000-150,000 annually"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timeline
              </label>
              <input
                type="text"
                name="timeline"
                value={formData.timeline}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="e.g., Next 60 days"
              />
            </div>
          </div>
        </div>

        {/* Scheduling */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Scheduling</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Consultation Date
              </label>
              <input
                type="date"
                name="consultation_date"
                value={formData.consultation_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Consultation Time
              </label>
              <input
                type="time"
                name="consultation_time"
                value={formData.consultation_time}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Follow-up Date
              </label>
              <input
                type="date"
                name="follow_up_date"
                value={formData.follow_up_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Message and Notes */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message/Inquiry
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="Original message or inquiry details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Internal Notes
            </label>
            <textarea
              name="internal_notes"
              value={formData.internal_notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="Internal notes for team use only..."
            />
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
            {loading ? 'Saving...' : (lead ? 'Update Lead' : 'Add Lead')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeadForm;