# Smart PMS — HTML-based Full-Stack-Style Prototype

## Included
- `index.html` — application pages and forms
- `css/style.css` — responsive UI styles
- `js/app.js` — registration, duplicate checks, search, simulated RFID lookup, lost-card recovery, replacement-card workflow, and activity logs

## Run directly
1. Extract the ZIP.
2. Open `index.html` in Chrome, Edge, Firefox, or another modern browser.
3. No Python, Flask, npm, or server installation is needed for this prototype.

## Demo checklist
1. Register a fictional patient. Optionally assign UID `A1B2C3D4`.
2. Go to RFID Lookup and enter `A1B2C3D4`.
3. Go to Lost Card Recovery and search by patient ID or phone.
4. Register a patient with a matching phone or name to test duplicate warnings.
5. Open the record and use Replace / assign card to test replacement.
6. Export activity logs as CSV.

## Data and security limitations
This is a **front-end-only prototype**, not a true server-backed full stack. It stores data in browser `localStorage`, so records are limited to that browser/profile and can be edited or deleted by the device user. There is no real login, server-side authorization, central database, or secure audit trail. Use fictional data only.

For a genuine multi-user full-stack PMS, the next step is a backend such as Flask + SQLite (or another server database), authentication, server-side validation, CSRF protection, access controls, backups, and an institution-approved privacy/security review.

## Later Arduino integration
The current RFID screen simulates scanning by entering a UID. A browser opened from a local file cannot directly read Arduino's USB serial port. Later, connect Arduino + RC522 through a local serial bridge/backend, or use a secure local app with serial-port access, and send the UID to the backend for lookup. RFID UID alone is not secure proof of patient identity.
