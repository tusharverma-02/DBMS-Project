# Quick Setup Guide

## Step 1: Setup MySQL Database

1. Make sure MySQL is running on your system
2. Open MySQL command line or MySQL Workbench
3. Run this command:

```sql
source database.sql
```

OR copy-paste the contents of `database.sql` into MySQL and execute it.

## Step 2: Update Database Password

Open `server.js` and change line 16:

```javascript
password: '',  // Put your MySQL password here
```

## Step 3: Start the Server

```bash
npm start
```

## Step 4: Open in Browser

Go to: http://localhost:3000

## That's it! You're ready to use the Event Ticketing System.

---

## Testing Peak-Hour Concurrency

1. Open 2-3 browser windows
2. Register different users in each window
3. Try booking the same event simultaneously
4. Watch how the system prevents double-booking!
