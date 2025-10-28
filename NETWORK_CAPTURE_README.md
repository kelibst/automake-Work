# Network Call Capture Scripts

This directory contains two Playwright scripts to help you identify the exact AJAX/API calls made when submitting the DHIMS2 form.

## Scripts

### 1. `capture-form-submission.js` (RECOMMENDED - Start with this one!)
**Best for:** Quickly finding form submission calls

This script focuses ONLY on POST requests (which are typical for form submissions). It will:
- Show real-time logs of all POST requests in the console
- Display full request headers, payload, and response
- Save all POST requests to a JSON file

**Run it:**
```bash
node capture-form-submission.js
```

### 2. `capture-network-calls.js`
**Best for:** Complete network analysis (if first script doesn't work)

This script captures ALL network requests including:
- XHR (AJAX) requests
- Fetch requests
- Regular HTTP requests
- All methods (GET, POST, PUT, etc.)

**Run it:**
```bash
node capture-network-calls.js
```

## How to Use

### Step 1: Run the Script
```bash
node capture-form-submission.js
```

### Step 2: Interact with DHIMS2
When the browser opens:
1. Log in to DHIMS2 (https://events.chimgh.org/events/)
2. Navigate to the In-Patient Morbidity form
3. Fill out the form with test data
4. **SUBMIT the form**
5. Watch the terminal/console - you'll see the API call appear immediately!

### Step 3: Review the Output

#### In the Console (Real-time)
You'll see output like:
```
🚨 POST REQUEST DETECTED (Possible Form Submission):
═════════════════════════════════════════════════════════
🔗 URL: https://events.chimgh.org/events/api/41/events
📡 Type: xhr (AJAX)
⏰ Time: 2025-10-28T18:00:00.000Z

📋 REQUEST HEADERS:
  content-type: application/json
  authorization: Bearer eyJhbGc...
  ...

📦 POST DATA:
{
  "program": "fFYTJRzD2qq",
  "orgUnit": "duCDqCRlWG1",
  "eventDate": "2025-10-28",
  "dataValues": [
    {
      "dataElement": "okahaacYKqO",
      "value": "VR-A01-AAG1234"
    },
    ...
  ]
}
═════════════════════════════════════════════════════════
```

#### In the Saved Files
After stopping the script (Ctrl+C), you'll find logs in the `network-logs/` directory:
- `form-submissions-TIMESTAMP.json` - All captured POST requests with full details
- `ajax-calls-TIMESTAMP.json` - AJAX/XHR calls only (from capture-network-calls.js)
- `summary-TIMESTAMP.json` - Summary statistics (from capture-network-calls.js)

### Step 4: Stop and Save
Press **Ctrl+C** when you're done. The script will automatically save all captured data.

## What to Look For

### The API Endpoint URL
Look for a POST request to something like:
- `https://events.chimgh.org/events/api/41/events`
- `https://events.chimgh.org/events/api/*/tracker`
- Any URL containing `/api/` and receiving POST requests

### The Payload Structure
The POST data will show you:
- Field names (dataElement IDs)
- Data structure (how the form data is formatted)
- Required headers
- Authentication tokens

### Example of What You Might Find
```json
{
  "url": "https://events.chimgh.org/events/api/41/events",
  "method": "POST",
  "headers": {
    "content-type": "application/json",
    "authorization": "Bearer TOKEN_HERE",
    "x-requested-with": "XMLHttpRequest"
  },
  "postData": {
    "program": "fFYTJRzD2qq",
    "orgUnit": "duCDqCRlWG1",
    "eventDate": "2025-10-28",
    "status": "COMPLETED",
    "dataValues": [
      {
        "dataElement": "okahaacYKqO",
        "value": "VR-A01-AAG1234"
      }
    ]
  }
}
```

## Troubleshooting

### No POST requests showing up?
- Make sure you actually submitted the form (clicked the submit button)
- Try the full capture script: `node capture-network-calls.js`
- Check if the form uses a different method (PUT, PATCH)

### Can't see the console output clearly?
- The output is also saved to files in `network-logs/` directory
- Open the JSON files to review the captured data

### Script stops too early?
- The script waits 30 minutes by default
- Press Ctrl+C manually when you're done (no need to wait)

## Next Steps

Once you've captured the API call:
1. **Identify the endpoint URL** - This is where we'll send data
2. **Understand the payload structure** - This is how we'll format the data
3. **Extract the dataElement IDs** - This is how we'll map Excel columns to API fields
4. **Note the required headers** - This is what we'll need to authenticate

Then we can update the Chrome Extension to use this exact API structure!

## Files Generated

All output files are saved in the `network-logs/` directory with timestamps:
- `form-submissions-2025-10-28T18-00-00-000Z.json`
- `ajax-calls-2025-10-28T18-00-00-000Z.json`
- `summary-2025-10-28T18-00-00-000Z.json`
