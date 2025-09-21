-- Sample data for Shallow Bay Advisors CRM

-- Sample Properties
INSERT INTO properties (
  title, type, location, county, price, size, available, featured,
  description, features, street_address, city, state, zip_code,
  lease_term, clear_height, loading_docks, parking, year_built
) VALUES
(
  'Premium Warehouse in Doral',
  'warehouse',
  'Doral',
  'Miami-Dade',
  '$8.50/sq ft',
  '25,000 sq ft',
  true,
  true,
  'Modern warehouse facility with excellent highway access and premium amenities.',
  '["Dock High", "Highway Access", "Office Space", "Climate Controlled", "Security System"]',
  '1234 NW 79th Ave',
  'Doral',
  'FL',
  '33166',
  '5-10 years',
  '32 feet',
  6,
  50,
  2018
),
(
  'Industrial Complex in Fort Lauderdale',
  'industrial',
  'Fort Lauderdale',
  'Broward',
  '$12.00/sq ft',
  '45,000 sq ft',
  true,
  false,
  'Large industrial complex perfect for manufacturing and distribution operations.',
  '["Heavy Power", "Rail Access", "Crane Ready", "Multiple Loading Docks", "Parking"]',
  '5678 Industrial Blvd',
  'Fort Lauderdale',
  'FL',
  '33309',
  '10+ years',
  '28 feet',
  8,
  75,
  2015
),
(
  'Modern Office Space in Boca Raton',
  'office',
  'Boca Raton',
  'Palm Beach',
  '$25.00/sq ft',
  '8,500 sq ft',
  true,
  true,
  'Class A office space in prime location with modern amenities.',
  '["High-Speed Internet", "Conference Rooms", "Kitchen", "Parking Garage", "Reception Area"]',
  '9876 Corporate Center Dr',
  'Boca Raton',
  'FL',
  '33487',
  '3-7 years',
  '9 feet',
  0,
  25,
  2020
),
(
  'Flex Space in Pompano Beach',
  'flex-space',
  'Pompano Beach',
  'Broward',
  '$15.00/sq ft',
  '12,000 sq ft',
  true,
  false,
  'Versatile flex space suitable for office and light industrial use.',
  '["Mixed Use", "Drive-In Doors", "Office Build-Out", "Ample Parking"]',
  '4321 Commerce Way',
  'Pompano Beach',
  'FL',
  '33064',
  '3-5 years',
  '16 feet',
  2,
  30,
  2017
),
(
  'Distribution Center in Hialeah',
  'distribution',
  'Hialeah',
  'Miami-Dade',
  '$7.25/sq ft',
  '65,000 sq ft',
  false,
  false,
  'Large distribution center with excellent transportation access.',
  '["Cross Dock", "Interstate Access", "Rail Served", "Multiple Truck Courts"]',
  '1111 Distribution Dr',
  'Hialeah',
  'FL',
  '33012',
  '7-15 years',
  '30 feet',
  12,
  100,
  2012
);

-- Sample Leads
INSERT INTO leads (
  title, type, status, priority, name, email, phone, company,
  property_interest, space_requirements, budget, timeline, message,
  source, internal_notes
) VALUES
(
  'Warehouse Inquiry - Tech Startup',
  'property-inquiry',
  'new',
  'high',
  'Sarah Johnson',
  'sarah@techstartup.com',
  '(305) 555-0123',
  'TechStartup Inc.',
  'Warehouse in Doral area',
  'Need 15,000-20,000 sq ft for inventory storage and small office',
  '$100,000-150,000 annually',
  'Next 60 days',
  'Looking for modern warehouse with good highway access for our growing e-commerce business.',
  'website',
  'Very interested, has budget ready. Follow up ASAP.'
),
(
  'Office Space Consultation',
  'consultation',
  'contacted',
  'medium',
  'Michael Rodriguez',
  'mrodriguez@lawfirm.com',
  '(954) 555-0156',
  'Rodriguez Law Firm',
  'Office space in Broward County',
  '5,000-8,000 sq ft for law firm expansion',
  '$150,000-200,000 annually',
  'Next 90 days',
  'Growing law firm needs professional office space with conference rooms.',
  'referral',
  'Referred by existing client. Scheduled call for Friday.'
),
(
  'Industrial Space Request',
  'property-inquiry',
  'qualified',
  'urgent',
  'David Chen',
  'david.chen@manufacturing.com',
  '(561) 555-0189',
  'Precision Manufacturing',
  'Industrial facility in Palm Beach County',
  '30,000+ sq ft with heavy power and crane access',
  '$300,000+ annually',
  'ASAP - current lease expires in 30 days',
  'Manufacturing company needs to relocate quickly due to lease expiration.',
  'cold-call',
  'Serious buyer, lease expires soon. High priority follow-up.'
),
(
  'General Inquiry',
  'general-inquiry',
  'new',
  'low',
  'Lisa Thompson',
  'lisa.t@consulting.com',
  '(305) 555-0167',
  'Thompson Consulting',
  'Flexible office space',
  'Small office space for consulting firm',
  'Under $50,000 annually',
  'Next 6 months',
  'Small consulting firm looking for affordable office space.',
  'social-media',
  'Budget seems low for our typical properties.'
),
(
  'Warehouse Consultation Booking',
  'consultation',
  'proposal-sent',
  'high',
  'Robert Kim',
  'robert@logistics.com',
  '(954) 555-0145',
  'Sunshine Logistics',
  'Large distribution center',
  '50,000+ sq ft warehouse with dock doors',
  '$400,000+ annually',
  'Next 45 days',
  'Logistics company expanding operations in South Florida.',
  'trade-show',
  'Met at trade show. Sent proposal on Monday. Awaiting response.'
);

-- Sample Appointments
INSERT INTO appointments (
  title, description, start_time, end_time, location, attendees, status
) VALUES
(
  'Property Tour - TechStartup Inc.',
  'Show warehouse options in Doral area to Sarah Johnson',
  '2025-09-22 10:00:00-04',
  '2025-09-22 11:30:00-04',
  '1234 NW 79th Ave, Doral, FL 33166',
  '["sarah@techstartup.com"]',
  'scheduled'
),
(
  'Consultation Call - Rodriguez Law Firm',
  'Discuss office space requirements with Michael Rodriguez',
  '2025-09-23 14:00:00-04',
  '2025-09-23 15:00:00-04',
  'Phone Call',
  '["mrodriguez@lawfirm.com"]',
  'confirmed'
),
(
  'Site Visit - Precision Manufacturing',
  'Urgent showing of industrial facilities',
  '2025-09-21 09:00:00-04',
  '2025-09-21 11:00:00-04',
  '5678 Industrial Blvd, Fort Lauderdale, FL 33309',
  '["david.chen@manufacturing.com"]',
  'confirmed'
);

-- Sample Lead Activities
INSERT INTO lead_activities (
  lead_id, activity_type, title, description, metadata
) VALUES
(
  (SELECT id FROM leads WHERE email = 'sarah@techstartup.com'),
  'email',
  'Initial inquiry response sent',
  'Sent property options and availability information',
  '{"email_type": "property_options", "properties_sent": 3}'
),
(
  (SELECT id FROM leads WHERE email = 'mrodriguez@lawfirm.com'),
  'call',
  'Follow-up call completed',
  'Discussed space requirements and budget parameters',
  '{"call_duration": "15 minutes", "outcome": "positive"}'
),
(
  (SELECT id FROM leads WHERE email = 'david.chen@manufacturing.com'),
  'status_change',
  'Lead qualified',
  'Lead moved from contacted to qualified status',
  '{"previous_status": "contacted", "new_status": "qualified", "reason": "budget_confirmed"}'
),
(
  (SELECT id FROM leads WHERE email = 'robert@logistics.com'),
  'meeting',
  'Proposal presentation completed',
  'Presented distribution center options and pricing',
  '{"meeting_type": "proposal", "properties_shown": 2, "proposal_value": "$450000"}'
);