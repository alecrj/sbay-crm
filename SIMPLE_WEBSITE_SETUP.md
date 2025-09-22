# 🚀 Simple Website Integration Setup

## What This Does
Your website forms will automatically send leads to your CRM dashboard when visitors submit them.

---

## Step 1: Find Your Website's Contact Form

Look for your existing HTML contact form. It probably looks like this:

```html
<form>
  <input type="text" name="name" placeholder="Name">
  <input type="email" name="email" placeholder="Email">
  <textarea name="message" placeholder="Message"></textarea>
  <button type="submit">Send</button>
</form>
```

---

## Step 2: Add an ID to Your Form

Add `id="contact-form"` to your form tag:

```html
<form id="contact-form">
  <input type="text" name="name" placeholder="Name">
  <input type="email" name="email" placeholder="Email">
  <textarea name="message" placeholder="Message"></textarea>
  <button type="submit">Send</button>
</form>
```

---

## Step 3: Add This JavaScript Code

**WHERE TO PUT IT:** Add this code right before the closing `</body>` tag of your website:

```html
<script>
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
</script>
```

---

## Step 4: Test It

1. Go to your website
2. Fill out the contact form
3. Submit it
4. You should see "Thank you! Your message has been sent."
5. Check your CRM dashboard - the lead should appear there!

---

## Step 5: Test Your Integration First

Before going live, test using this URL: **http://localhost:3000/test-api**

This page lets you test all the API endpoints to make sure everything works.

---

## Common Issues & Fixes

### ❌ "ReferenceError: fetch is not defined"
**Fix:** Your website is very old. Add this before your script:
```html
<script src="https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.2/dist/fetch.umd.js"></script>
```

### ❌ Form submits but page refreshes
**Fix:** Make sure you have `e.preventDefault();` at the top of your function.

### ❌ "CORS error" in browser console
**Fix:** Make sure you're using `https://sbaycrm.netlify.app` (not localhost) in the fetch URL.

### ❌ Nothing happens when form is submitted
**Fix:** Check that your form has `id="contact-form"` and the script is after the form in your HTML.

---

## Want More Fields?

Add these to your HTML form AND the JavaScript:

```html
<!-- Add to HTML -->
<input type="tel" name="phone" placeholder="Phone">
<input type="text" name="company" placeholder="Company">

<!-- Add to JavaScript body: -->
phone: data.phone || '',
company: data.company || '',
property_interest: data.property_interest || '',
budget: data.budget || '',
```

---

## WordPress Users

If your site is WordPress, add this to your theme's `footer.php` file instead, or use a plugin like "Insert Headers and Footers" to add the script.

---

## Next Steps

1. ✅ Add the code to your website
2. ✅ Test the form submission
3. ✅ Check leads appear in your CRM
4. 🎯 Set up user invitations for your team
5. 🎯 Add property listings to your website

**Need help?** Check your CRM at: https://sbaycrm.netlify.app/test-api to test everything works.