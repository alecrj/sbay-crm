'use client';

import React, { useState } from 'react';

export default function SetupPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const javascriptCode = `<script>
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Get form data
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  // Show loading message
  const submitButton = e.target.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Sending...';
  submitButton.disabled = true;

  try {
    // Send to your CRM
    const response = await fetch('https://sbaycrm.netlify.app/api/public/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        company: data.company || '',
        message: data.message || '',
        source: 'website'
      })
    });

    const result = await response.json();

    if (result.success) {
      alert('Thank you! Your message has been sent.');
      e.target.reset(); // Clear the form
    } else {
      throw new Error(result.error || 'Something went wrong');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Sorry, there was an error. Please try again or call us directly.');
  } finally {
    // Reset button
    submitButton.textContent = originalText;
    submitButton.disabled = false;
  }
});
</script>`;

  const htmlForm = `<form id="contact-form">
  <input type="text" name="name" placeholder="Full Name" required>
  <input type="email" name="email" placeholder="Email" required>
  <input type="tel" name="phone" placeholder="Phone">
  <input type="text" name="company" placeholder="Company">
  <textarea name="message" placeholder="Message"></textarea>
  <button type="submit">Send Message</button>
</form>`;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🚀 Website Integration Setup
          </h1>
          <p className="text-gray-600 mb-6">
            Connect your website contact forms to this CRM in 3 simple steps.
          </p>

          {/* Step 1 */}
          <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-900 mb-3">
              Step 1: Add ID to Your Contact Form
            </h2>
            <p className="text-blue-800 mb-4">
              Find your website's contact form and add <code className="bg-blue-100 px-2 py-1 rounded">id="contact-form"</code> to the form tag.
            </p>
            <div className="bg-white p-4 rounded border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">HTML Form Example:</span>
                <button
                  onClick={() => copyToClipboard(htmlForm, 'html')}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  {copied === 'html' ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="text-sm text-gray-800 overflow-x-auto">
                <code>{htmlForm}</code>
              </pre>
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-xl font-semibold text-green-900 mb-3">
              Step 2: Add JavaScript Code
            </h2>
            <p className="text-green-800 mb-4">
              Copy this code and paste it right before the closing <code className="bg-green-100 px-2 py-1 rounded">&lt;/body&gt;</code> tag of your website.
            </p>
            <div className="bg-white p-4 rounded border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">JavaScript Code:</span>
                <button
                  onClick={() => copyToClipboard(javascriptCode, 'js')}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  {copied === 'js' ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="text-sm text-gray-800 overflow-x-auto max-h-64 overflow-y-auto">
                <code>{javascriptCode}</code>
              </pre>
            </div>
          </div>

          {/* Step 3 */}
          <div className="mb-8 p-6 bg-purple-50 border border-purple-200 rounded-lg">
            <h2 className="text-xl font-semibold text-purple-900 mb-3">
              Step 3: Test Your Integration
            </h2>
            <p className="text-purple-800 mb-4">
              Test your form submission and verify leads appear in your CRM.
            </p>
            <div className="space-y-3">
              <a
                href="/test-api"
                className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                🧪 Test API Endpoints
              </a>
              <div className="text-sm text-purple-700">
                <p>• Fill out your website's contact form</p>
                <p>• Check that you see "Thank you! Your message has been sent."</p>
                <p>• Verify the lead appears in your CRM dashboard</p>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="text-xl font-semibold text-yellow-900 mb-3">
              🔧 Common Issues & Solutions
            </h2>
            <div className="space-y-3 text-sm text-yellow-800">
              <div>
                <strong>Form submits but page refreshes:</strong>
                <p>Make sure the JavaScript code includes <code>e.preventDefault();</code></p>
              </div>
              <div>
                <strong>Nothing happens when form is submitted:</strong>
                <p>Check that your form has <code>id="contact-form"</code> and the script is after the form</p>
              </div>
              <div>
                <strong>CORS error in browser console:</strong>
                <p>Make sure you're using <code>https://sbaycrm.netlify.app</code> in the fetch URL</p>
              </div>
              <div>
                <strong>Old browser support needed:</strong>
                <p>Add this before your script: <code>&lt;script src="https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.2/dist/fetch.umd.js"&gt;&lt;/script&gt;</code></p>
              </div>
            </div>
          </div>

          {/* WordPress */}
          <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📝 WordPress Users
            </h3>
            <p className="text-gray-700 text-sm">
              Add the JavaScript code to your theme's <code>footer.php</code> file, or use a plugin like "Insert Headers and Footers" to add it to your site.
            </p>
          </div>

          {/* Next Steps */}
          <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              🎯 What's Next?
            </h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>✅ Website forms connected to CRM</p>
              <p>🔄 Set up user invitations for your team</p>
              <p>🏢 Add property listings to your website</p>
              <p>📧 Configure email notifications</p>
              <p>📅 Enable appointment booking</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}