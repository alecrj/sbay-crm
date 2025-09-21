# Website Integration Guide

This guide explains how to integrate the Shallow Bay Advisors CRM with the public website for seamless lead capture and appointment booking.

## Overview

The CRM provides public API endpoints that allow the main website to:
- Submit contact form leads directly into the CRM
- Book appointments with automatic calendar integration
- Check appointment availability in real-time
- Automatically trigger notifications and reminders

## API Endpoints

### Base URL
- **Development**: `http://localhost:3000/api/public`
- **Production**: `https://your-crm-domain.com/api/public`

### Authentication
All public endpoints support optional API key authentication via the `X-API-Key` header for enhanced security.

```bash
# Optional - set in environment variables
PUBLIC_API_KEY=your-secure-api-key
NEXT_PUBLIC_WEBSITE_URL=https://your-website-domain.com
```

## 1. Lead Submission API

### Endpoint: `POST /api/public/leads`

Submit leads from contact forms, property inquiries, or consultation requests.

#### Request Example

```javascript
const submitLead = async (formData) => {
  try {
    const response = await fetch('https://your-crm-domain.com/api/public/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key' // Optional
      },
      body: JSON.stringify({
        // Required fields
        name: formData.name,
        email: formData.email,

        // Optional fields
        phone: formData.phone,
        company: formData.company,
        property_interest: formData.propertyInterest,
        space_requirements: formData.spaceRequirements,
        budget: formData.budget,
        timeline: formData.timeline,
        message: formData.message,

        // System fields (optional)
        title: 'Custom Lead Title',
        type: 'property-inquiry', // consultation, property-inquiry, general-inquiry, contact-form
        priority: 'high', // low, medium, high, urgent
        source: 'website', // website, referral, cold-call, email-campaign, social-media, trade-show, other

        // Date fields (optional)
        consultation_date: '2024-01-15',
        consultation_time: '10:00 AM',
        follow_up_date: '2024-01-20'
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('Lead submitted successfully:', result.leadId);
      return result;
    } else {
      console.error('Error:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to submit lead:', error);
    throw error;
  }
};
```

#### Response Format

```json
{
  "success": true,
  "leadId": "uuid-lead-id",
  "action": "created", // or "updated" if email already exists
  "message": "Lead created successfully"
}
```

#### Error Responses

```json
{
  "error": "Name and email are required",
  "message": "Validation failed"
}
```

## 2. Appointment Booking API

### Endpoint: `POST /api/public/appointments`

Book appointments directly from the website with automatic calendar integration.

#### Request Example

```javascript
const bookAppointment = async (appointmentData) => {
  try {
    const response = await fetch('https://your-crm-domain.com/api/public/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key' // Optional
      },
      body: JSON.stringify({
        // Required fields
        name: appointmentData.name,
        email: appointmentData.email,
        appointmentDate: '2024-01-15', // YYYY-MM-DD
        appointmentTime: '10:00', // HH:MM (24-hour format)

        // Optional fields
        phone: appointmentData.phone,
        company: appointmentData.company,
        property_interest: appointmentData.propertyInterest,
        message: appointmentData.message,

        // Appointment details (optional)
        title: 'Property Consultation',
        location: 'Office Meeting',
        duration: 60, // minutes, default 60
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('Appointment booked:', result.appointmentId);
      return result;
    } else {
      console.error('Error:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to book appointment:', error);
    throw error;
  }
};
```

#### Response Format

```json
{
  "success": true,
  "appointmentId": "uuid-appointment-id",
  "googleEventId": "google-calendar-event-id",
  "leadId": "uuid-lead-id",
  "message": "Appointment scheduled successfully",
  "appointmentDetails": {
    "title": "Property Consultation",
    "date": "2024-01-15",
    "time": "10:00",
    "location": "Office Meeting",
    "duration": "60 minutes"
  }
}
```

## 3. Appointment Availability API

### Endpoint: `GET /api/public/appointments/availability`

Check available time slots for appointment booking.

#### Request Example

```javascript
const getAvailability = async (date, duration = 60) => {
  try {
    const response = await fetch(
      `https://your-crm-domain.com/api/public/appointments/availability?date=${date}&duration=${duration}`,
      {
        headers: {
          'X-API-Key': 'your-api-key' // Optional
        }
      }
    );

    const result = await response.json();

    if (result.success) {
      return result;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to get availability:', error);
    throw error;
  }
};

// Usage
const availability = await getAvailability('2024-01-15', 60);
console.log('Available slots:', availability.slots);
```

#### Response Format

```json
{
  "success": true,
  "date": "2024-01-15",
  "duration": 60,
  "businessHours": {
    "start": "9:00",
    "end": "17:00"
  },
  "totalAvailable": 8,
  "slots": [
    {
      "datetime": "2024-01-15T14:00:00.000Z",
      "time": "9:00 AM",
      "timestamp": 1705320000000
    }
  ],
  "groupedSlots": {
    "morning": [...],
    "afternoon": [...]
  },
  "timezone": "America/New_York"
}
```

## Implementation Examples

### React Contact Form

```jsx
import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    propertyInterest: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          type: 'contact-form',
          source: 'website'
        })
      });

      const result = await response.json();

      if (result.success) {
        setSubmitted(true);
        // Show success message or redirect
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="success-message">
        <h3>Thank you!</h3>
        <p>We've received your inquiry and will contact you soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Full Name *"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        required
      />
      <input
        type="email"
        placeholder="Email Address *"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
      />
      <input
        type="tel"
        placeholder="Phone Number"
        value={formData.phone}
        onChange={(e) => setFormData({...formData, phone: e.target.value})}
      />
      <input
        type="text"
        placeholder="Company"
        value={formData.company}
        onChange={(e) => setFormData({...formData, company: e.target.value})}
      />
      <input
        type="text"
        placeholder="Property Interest"
        value={formData.propertyInterest}
        onChange={(e) => setFormData({...formData, propertyInterest: e.target.value})}
      />
      <textarea
        placeholder="Message"
        value={formData.message}
        onChange={(e) => setFormData({...formData, message: e.target.value})}
        rows={4}
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Send Message'}
      </button>
    </form>
  );
};

export default ContactForm;
```

### Appointment Booking Widget

```jsx
import React, { useState, useEffect } from 'react';

const AppointmentBooking = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate);
    }
  }, [selectedDate]);

  const fetchAvailability = async (date) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/crm/availability?date=${date}`);
      const result = await response.json();
      setAvailableSlots(result.slots || []);
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const bookAppointment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/crm/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
          title: 'Property Consultation'
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Appointment booked successfully!');
        // Reset form or redirect
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Failed to book appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="appointment-booking">
      <h3>Book a Consultation</h3>

      <div className="form-step">
        <label>Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      {selectedDate && (
        <div className="form-step">
          <label>Available Times:</label>
          {isLoading ? (
            <p>Loading available times...</p>
          ) : (
            <div className="time-slots">
              {availableSlots.map((slot) => (
                <button
                  key={slot.timestamp}
                  className={`time-slot ${selectedTime === slot.time ? 'selected' : ''}`}
                  onClick={() => setSelectedTime(slot.time)}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTime && (
        <div className="contact-info">
          <input
            type="text"
            placeholder="Full Name *"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <input
            type="email"
            placeholder="Email Address *"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
          <textarea
            placeholder="Additional Notes"
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
            rows={3}
          />
          <button onClick={bookAppointment} disabled={isLoading}>
            {isLoading ? 'Booking...' : 'Book Appointment'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AppointmentBooking;
```

## Environment Configuration

Update your `.env.local` file:

```env
# Public API Configuration
PUBLIC_API_KEY=your-secure-random-api-key
NEXT_PUBLIC_WEBSITE_URL=https://shallowbayadvisors.com

# CORS Configuration
NEXT_PUBLIC_CRM_API_URL=https://your-crm-domain.com
```

## Security Considerations

1. **API Key Protection**: Store the API key securely and never expose it in client-side code
2. **CORS Configuration**: The CRM will only accept requests from your configured website domain
3. **Rate Limiting**: Consider implementing rate limiting for public endpoints
4. **Data Validation**: All inputs are validated server-side
5. **HTTPS Only**: Use HTTPS in production for all API communications

## Testing

### Test Lead Submission

```bash
curl -X POST https://your-crm-domain.com/api/public/leads \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "(555) 123-4567",
    "company": "Test Company",
    "property_interest": "Office Space",
    "message": "Looking for 5000 sq ft office space",
    "type": "property-inquiry",
    "source": "website"
  }'
```

### Test Appointment Booking

```bash
curl -X POST https://your-crm-domain.com/api/public/appointments \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "(555) 987-6543",
    "appointmentDate": "2024-01-15",
    "appointmentTime": "14:00",
    "title": "Property Consultation",
    "message": "Interested in warehouse space"
  }'
```

### Test Availability Check

```bash
curl "https://your-crm-domain.com/api/public/appointments/availability?date=2024-01-15&duration=60" \
  -H "X-API-Key: your-api-key"
```

## Integration Checklist

- [ ] Configure environment variables
- [ ] Set up CORS for your website domain
- [ ] Test lead submission API
- [ ] Test appointment booking API
- [ ] Test availability checking API
- [ ] Implement error handling in your forms
- [ ] Add loading states for better UX
- [ ] Test with real Google Calendar integration
- [ ] Verify notification system is working
- [ ] Set up monitoring for API endpoints

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `NEXT_PUBLIC_WEBSITE_URL` matches your website domain exactly
2. **API Key Issues**: Verify the API key is set correctly in both environments
3. **Calendar Integration**: Ensure Google Calendar API is properly configured
4. **Time Zone Issues**: All times are handled in America/New_York timezone

### Support

For integration support or issues, check:
1. CRM logs in the admin panel
2. Browser developer console for client-side errors
3. Network tab for API request/response details
4. Database logs for data persistence issues