# iOS Login Debug Checklist

## ✅ Already Fixed (Backend):
- [x] Added receiver login logic
- [x] Added `isActive` field to Driver model
- [x] Added `isActive` field to Receiver model
- [x] Email normalization (lowercase, trim)
- [x] Support both email and phoneNumber for receivers

## 🔍 If Still Having Issues:

### 1. **Check iOS App Request Headers:**
Make sure your iOS app sends proper headers:
```swift
// iOS Swift example
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue("application/json", forHTTPHeaderField: "Accept")
```

### 2. **Check Request Body Format:**
```json
// Correct format for receiver login
{
  "email": "receiver@example.com",
  "role": "receiver"
}

// OR for driver login
{
  "phoneNumber": "+1234567890",
  "role": "driver"
}
```

### 3. **Check iOS Network Logs:**
```swift
// Enable verbose logging in iOS
URLSession.shared.configuration.waitsForConnectivity = true
```

### 4. **Verify Backend is Running:**
- Server URL: http://srv830738.hstgr.cloud
- Test endpoint: POST /api/auth/login
- Check if server is accessible from iOS device

### 5. **Common iOS-Specific Issues:**

#### ❌ ATS (App Transport Security):
If your server uses HTTP (not HTTPS), you need to disable ATS:
```xml
<!-- Info.plist -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

#### ❌ Case Sensitivity:
iOS is case-sensitive with email addresses. The fix already handles this:
```javascript
// Backend now normalizes emails
email: email.toLowerCase().trim()
```

#### ❌ JSON Parsing:
Make sure iOS properly encodes JSON:
```swift
let encoder = JSONEncoder()
encoder.outputFormatting = .prettyPrinted
let jsonData = try encoder.encode(loginData)
```

### 6. **Test with Postman/curl First:**
```bash
# Test receiver login
curl -X POST http://srv830738.hstgr.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"receiver@example.com","role":"receiver"}'

# Test driver login
curl -X POST http://srv830738.hstgr.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+1234567890","role":"driver"}'
```

## 🚫 What NOT to Do:

### ❌ Don't Change UTF-8 Encoding:
- UTF-8 is the standard and works on all platforms
- Changing to UTF-16 will BREAK Android and Web
- iOS fully supports UTF-8

### ❌ Don't Add Special Headers for iOS:
- The fix is in the backend logic, not headers
- All platforms should use the same API

## 📊 Verify the Fix:

### Check Database Records:
```javascript
// Make sure existing users have isActive field
db.drivers.updateMany({}, { $set: { isActive: true } })
db.receivers.updateMany({}, { $set: { isActive: true } })
```

### Check Model Schemas:
- ✅ Driver model has `isActive` field
- ✅ Receiver model has `isActive` field
- ✅ Receiver model has `role` field

## 🎯 Expected Behavior:

### Successful Login Response:
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "name": "...",
    "email": "...",
    "isActive": true
  },
  "role": "receiver"
}
```

### Error Response (if credentials wrong):
```json
{
  "status": "error",
  "message": "Incorrect credentials for receiver"
}
```

## 📞 Need More Help?

If the issue persists after applying these fixes:
1. Share the iOS error logs
2. Share the network request/response from iOS
3. Verify the server is accessible from iOS device
4. Check if you need to update existing database records
