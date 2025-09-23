"use client";

import React from "react";
import { Lead } from "@/lib/supabase";
import LeadAppointments from "./LeadAppointments";

interface LeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  priorityColor: string;
  isAdmin?: boolean;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onEdit, priorityColor, isAdmin = true }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getTypeIcon = (type: Lead['type']) => {
    switch (type) {
      case 'consultation':
        return '📞';
      case 'property-inquiry':
        return '🏢';
      case 'general-inquiry':
        return '💬';
      case 'contact-form':
        return '📝';
      default:
        return '📋';
    }
  };

  const getPriorityBadge = (priority: Lead['priority']) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getSourceIcon = (source: Lead['source']) => {
    switch (source) {
      case 'website': return '🌐';
      case 'referral': return '👥';
      case 'cold-call': return '📞';
      case 'email-campaign': return '📧';
      case 'social-media': return '📱';
      case 'trade-show': return '🏛️';
      case 'other': return '🔗';
      default: return '📋';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-shadow duration-200 border-l-4 ${priorityColor} ${isAdmin ? 'hover:shadow-md cursor-pointer' : 'cursor-default'}`}
      onClick={isAdmin ? () => onEdit(lead) : undefined}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getTypeIcon(lead.type)}</span>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {lead.name}
            </h4>
          </div>
          {getPriorityBadge(lead.priority)}
        </div>

        {/* Company */}
        {lead.company && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 font-medium">
            {lead.company}
          </p>
        )}

        {/* Contact Info */}
        <div className="space-y-1 mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            📧 {lead.email}
          </p>
          {lead.phone && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              📱 {lead.phone}
            </p>
          )}
        </div>

        {/* Property Interest */}
        {lead.property_interest && (
          <div className="mb-3">
            <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded p-2">
              🏢 {lead.property_interest}
            </p>
          </div>
        )}

        {/* Budget & Timeline */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          {lead.budget && (
            <div className="text-gray-600 dark:text-gray-300">
              <span className="font-medium">Budget:</span>
              <br />
              {lead.budget}
            </div>
          )}
          {lead.timeline && (
            <div className="text-gray-600 dark:text-gray-300">
              <span className="font-medium">Timeline:</span>
              <br />
              {lead.timeline}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{getSourceIcon(lead.source)}</span>
            <span className="capitalize">{lead.source.replace('-', ' ')}</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(lead.created_at)}
          </span>
        </div>

        {/* Follow-up date if exists */}
        {lead.follow_up_date && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              📅 Follow-up: {formatDate(lead.follow_up_date)}
            </span>
          </div>
        )}

        {/* Consultation date if exists */}
        {lead.consultation_date && (
          <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs">
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              🗓️ Consultation: {formatDate(lead.consultation_date)}
              {lead.consultation_time && ` at ${lead.consultation_time}`}
            </span>
          </div>
        )}

        {/* Appointments */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <LeadAppointments leadId={lead.id} />
        </div>
      </div>
    </div>
  );
};

export default LeadCard;