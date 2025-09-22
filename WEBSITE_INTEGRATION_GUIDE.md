# Website to CRM Integration Guide

## Overview

Your CRM already has public API endpoints ready for your website to connect to. Here's how to integrate your Shallow Bay Advisors website with the CRM.

## 🚀 **Available API Endpoints**

Your CRM provides these endpoints for website integration:

### **1. Submit Contact Forms & Leads**
**Endpoint**: `POST /api/public/leads`

### **2. Fetch Properties for Website**
**Endpoint**: `GET /api/public/properties`

### **3. Book Appointments**
**Endpoint**: `POST /api/public/appointments`

### **4. Check Appointment Availability**
**Endpoint**: `GET /api/public/appointments/availability`

---

## 📝 **Contact Form Integration**

### HTML Form Example
```html
<form id="contact-form">
  <input type="text" name="name" placeholder="Full Name" required>
  <input type="email" name="email" placeholder="Email" required>
  <input type="tel" name="phone" placeholder="Phone Number">
  <input type="text" name="company" placeholder="Company">
  <select name="property_interest">
    <option value="">Property Interest</option>
    <option value="warehouse">Warehouse</option>
    <option value="office">Office Space</option>
    <option value="industrial">Industrial</option>
    <option value="flex-space">Flex Space</option>
    <option value="distribution">Distribution Center</option>
  </select>
  <input type="text" name="space_requirements" placeholder="Space Requirements">
  <input type="text" name="budget" placeholder="Budget Range">
  <select name="timeline">
    <option value="">Timeline</option>
    <option value="immediate">Immediate</option>
    <option value="1-3 months">1-3 months</option>
    <option value="3-6 months">3-6 months</option>
    <option value="6+ months">6+ months</option>
  </select>
  <textarea name="message" placeholder="Additional Details"></textarea>
  <button type="submit">Submit Inquiry</button>
</form>
```

### JavaScript Integration
```javascript
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  try {
    const response = await fetch('https://sbaycrm.netlify.app/api/public/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        property_interest: data.property_interest,
        space_requirements: data.space_requirements,
        budget: data.budget,
        timeline: data.timeline,
        message: data.message,
        source: 'website', // Track that this came from the website
        type: 'contact-form'
      })
    });

    const result = await response.json();

    if (result.success) {
      alert('Thank you! Your inquiry has been submitted.');
      e.target.reset();
    } else {
      throw new Error(result.error || 'Submission failed');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Sorry, there was an error submitting your inquiry. Please try again.');
  }
});
```

---

## 🏢 **Property Listings Integration**

### Fetch Properties for Website
```javascript
async function loadProperties() {
  try {
    const response = await fetch('https://sbaycrm.netlify.app/api/public/properties?available=true&featured=true&limit=6');
    const data = await response.json();

    if (data.success) {
      displayProperties(data.properties);
    }
  } catch (error) {
    console.error('Error loading properties:', error);
  }
}

function displayProperties(properties) {
  const container = document.getElementById('properties-container');

  container.innerHTML = properties.map(property => `
    <div class="property-card">
      <img src="${property.image || '/placeholder.jpg'}" alt="${property.title}">
      <h3>${property.title}</h3>
      <p><strong>Type:</strong> ${property.type}</p>
      <p><strong>Location:</strong> ${property.location}</p>
      <p><strong>Size:</strong> ${property.size}</p>
      <p><strong>Price:</strong> ${property.price}</p>
      <p>${property.description}</p>
      <button onclick="inquireAboutProperty('${property.id}', '${property.title}')">
        Inquire About This Property
      </button>
    </div>
  `).join('');
}

function inquireAboutProperty(propertyId, propertyTitle) {
  // Pre-fill contact form with property interest
  document.querySelector('[name="property_interest"]').value = propertyTitle;
  document.querySelector('[name="message"]').value = `I'm interested in the property: ${propertyTitle}`;

  // Scroll to contact form
  document.getElementById('contact-form').scrollIntoView();
}
```

### Query Parameters for Properties
```javascript
// Get featured properties only
fetch('/api/public/properties?featured=true')

// Get available warehouses in Miami-Dade
fetch('/api/public/properties?available=true&type=warehouse&county=Miami-Dade')

// Get latest 10 properties
fetch('/api/public/properties?limit=10')
```

---

## 📅 **Appointment Booking Integration**

### Appointment Booking Form
```html
<form id="appointment-form">
  <input type="text" name="name" placeholder="Full Name" required>
  <input type="email" name="email" placeholder="Email" required>
  <input type="tel" name="phone" placeholder="Phone Number">
  <input type="text" name="company" placeholder="Company">
  <input type="date" name="appointmentDate" required>
  <select name="appointmentTime" required>
    <option value="">Select Time</option>
    <option value="09:00">9:00 AM</option>
    <option value="10:00">10:00 AM</option>
    <option value="11:00">11:00 AM</option>
    <option value="14:00">2:00 PM</option>
    <option value="15:00">3:00 PM</option>
    <option value="16:00">4:00 PM</option>
  </select>
  <select name="location">
    <option value="Office Meeting">Office Meeting</option>
    <option value="Video Call">Video Call</option>
    <option value="Property Visit">Property Visit</option>
  </select>
  <textarea name="message" placeholder="What would you like to discuss?"></textarea>
  <button type="submit">Book Appointment</button>
</form>
```

### JavaScript for Appointments
```javascript
document.getElementById('appointment-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  try {
    const response = await fetch('https://sbaycrm.netlify.app/api/public/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        location: data.location,
        message: data.message,
        title: `Consultation - ${data.name}`,
        duration: 60 // 60 minutes
      })
    });

    const result = await response.json();

    if (result.success) {
      alert('Your appointment has been booked! You will receive a confirmation email.');
      e.target.reset();
    } else {
      throw new Error(result.error || 'Booking failed');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Sorry, there was an error booking your appointment. Please try again.');
  }
});
```

---

## 🔧 **Environment Setup**

### 1. Add Environment Variable for Website URL
In your CRM's `.env.local`:
```env
NEXT_PUBLIC_WEBSITE_URL=https://yourdomain.com
```

### 2. Optional: Add API Key Security
Add to `.env.local`:
```env
PUBLIC_API_KEY=your-secure-api-key-here
```

Then in your website JavaScript, add the API key header:
```javascript
headers: {
  'Content-Type': 'application/json',
  'X-API-Key': 'your-secure-api-key-here'
}
```

---

## 🎨 **WordPress Integration**

If your website is on WordPress, you can use this PHP code:

```php
<?php
function submit_to_crm($data) {
    $url = 'https://sbaycrm.netlify.app/api/public/leads';

    $response = wp_remote_post($url, array(
        'headers' => array(
            'Content-Type' => 'application/json',
        ),
        'body' => json_encode($data),
        'timeout' => 30
    ));

    if (is_wp_error($response)) {
        return false;
    }

    $body = wp_remote_retrieve_body($response);
    $result = json_decode($body, true);

    return $result['success'] ?? false;
}

// Usage in Contact Form 7 or other forms
add_action('wpcf7_mail_sent', function($contact_form) {
    $submission = WPCF7_Submission::get_instance();
    $posted_data = $submission->get_posted_data();

    $lead_data = array(
        'name' => $posted_data['your-name'],
        'email' => $posted_data['your-email'],
        'phone' => $posted_data['your-phone'],
        'message' => $posted_data['your-message'],
        'source' => 'website'
    );

    submit_to_crm($lead_data);
});
?>
```

---

## 📊 **What Happens When Forms Are Submitted**

### Lead Submission Flow:
1. **Form submitted** from website
2. **Lead created** in CRM database
3. **Email notification** sent to admins (you)
4. **Lead appears** in CRM dashboard
5. **Activity logged** for tracking
6. **Follow-up reminders** can be set

### Appointment Booking Flow:
1. **Appointment requested** from website
2. **Lead created/updated** in CRM
3. **Google Calendar event** created
4. **Email reminders** scheduled (24h + 2h before)
5. **Appears in CRM** calendar and appointments
6. **Confirmation email** sent to client

---

## 🔍 **Testing Your Integration**

### 1. Test Lead Submission
```bash
curl -X POST https://sbaycrm.netlify.app/api/public/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Lead",
    "email": "test@example.com",
    "phone": "(305) 123-4567",
    "message": "Test submission from website",
    "source": "website"
  }'
```

### 2. Test Property Fetch
```bash
curl https://sbaycrm.netlify.app/api/public/properties?limit=5
```

### 3. Check in CRM
- Go to **Leads** section in CRM
- You should see test submissions appear
- Check **Activities** for tracking

---

## 🚨 **Important Notes**

1. **CORS Enabled**: The API already has CORS headers for cross-origin requests
2. **No Auth Required**: Public endpoints don't need authentication
3. **Automatic Notifications**: New leads automatically trigger email notifications to admins
4. **Lead Deduplication**: System checks for existing leads by email
5. **Data Validation**: Email format and required fields are validated
6. **Activity Logging**: All submissions are logged for tracking

---

## 🎯 **Quick Start Checklist**

- [ ] Copy the JavaScript code to your website
- [ ] Update the API URL to your CRM domain
- [ ] Test contact form submission
- [ ] Test property listing fetch
- [ ] Test appointment booking
- [ ] Verify leads appear in CRM
- [ ] Check email notifications work

Your website is now connected to your CRM! 🎉