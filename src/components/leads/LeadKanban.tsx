"use client";

import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase, Lead } from "@/lib/supabase";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { useUserRole } from "@/contexts/UserRoleContext";
import LeadForm from "./LeadForm";
import LeadCard from "./LeadCard";

const LEAD_STATUSES = [
  { id: "new", title: "Lead Form", color: "bg-blue-500" },
  { id: "tour-scheduled", title: "Tour Scheduled", color: "bg-purple-500" },
  { id: "canceled-no-show", title: "Canceled/No Show", color: "bg-orange-500" },
  { id: "showing-completed", title: "Showing Completed", color: "bg-yellow-500" },
  { id: "won", title: "Won", color: "bg-green-500" },
  { id: "lost", title: "Lost", color: "bg-red-500" },
] as const;

const LeadKanban: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { isOpen, openModal, closeModal } = useModal();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leads');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        console.error('API error fetching leads:', result.error);
        throw new Error(result.error);
      }

      setLeads(result.data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = () => {
    setSelectedLead(null);
    openModal();
  };

  const handleEditLead = (lead: Lead) => {
    if (!isAdmin) return; // Prevent editing for non-admin users
    setSelectedLead(lead);
    openModal();
  };

  const handleLeadSaved = () => {
    fetchLeads();
    closeModal();
  };

  const moveLead = async (leadId: string, newStatus: Lead['status']) => {
    if (!isAdmin) return; // Prevent moving leads for non-admin users

    try {
      const response = await fetch('/api/leads', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local state
      setLeads(prev => prev.map(lead =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));

    } catch (error) {
      console.error('Error moving lead:', error);
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLeadsByStatus = (status: string) => {
    return filteredLeads.filter(lead => lead.status === status);
  };

  const getPriorityColor = (priority: Lead['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Lead Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isAdmin ? "Track and manage your sales leads through the pipeline" : "View sales leads and their current status"}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleAddLead}
              className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">Add New Lead</span>
              <span className="sm:hidden">Add Lead</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Kanban Board */}
        <div className="flex space-x-3 sm:space-x-6 overflow-x-auto pb-6 -mx-3 px-3 sm:mx-0 sm:px-0">
          {LEAD_STATUSES.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              leads={getLeadsByStatus(status.id)}
              onMoveLead={moveLead}
              onEditLead={handleEditLead}
              getPriorityColor={getPriorityColor}
              isAdmin={isAdmin}
            />
          ))}
        </div>

        {/* Add/Edit Lead Modal */}
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-4xl p-6"
        >
          <LeadForm
            lead={selectedLead}
            onSave={handleLeadSaved}
            onCancel={closeModal}
          />
        </Modal>
      </div>
    </DndProvider>
  );
};

interface KanbanColumnProps {
  status: typeof LEAD_STATUSES[0];
  leads: Lead[];
  onMoveLead: (leadId: string, newStatus: Lead['status']) => void;
  onEditLead: (lead: Lead) => void;
  getPriorityColor: (priority: Lead['priority']) => string;
  isAdmin: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  leads,
  onMoveLead,
  onEditLead,
  getPriorityColor,
  isAdmin,
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'lead',
    drop: (item: { id: string }) => {
      if (isAdmin) {
        onMoveLead(item.id, status.id as Lead['status']);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver() && isAdmin,
    }),
  });

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-72 sm:w-80 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 sm:p-4 ${
        isOver ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${status.color}`}></div>
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
            {status.title}
          </h3>
          <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Lead Cards */}
      <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
        {leads.map((lead) => (
          <DraggableLeadCard
            key={lead.id}
            lead={lead}
            onEdit={onEditLead}
            priorityColor={getPriorityColor(lead.priority)}
            isAdmin={isAdmin}
          />
        ))}

        {leads.length === 0 && (
          <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            No leads in this stage
          </div>
        )}
      </div>
    </div>
  );
};

interface DraggableLeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  priorityColor: string;
  isAdmin: boolean;
}

const DraggableLeadCard: React.FC<DraggableLeadCardProps> = ({
  lead,
  onEdit,
  priorityColor,
  isAdmin,
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'lead',
    item: { id: lead.id },
    canDrag: isAdmin,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={isAdmin ? drag : null}
      className={`${isAdmin ? 'cursor-move' : 'cursor-default'} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <LeadCard
        lead={lead}
        onEdit={onEdit}
        priorityColor={priorityColor}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default LeadKanban;