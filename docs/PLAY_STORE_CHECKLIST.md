# 🎯 G88 Google Play Store Release Checklist

## Pre-Release Technical Requirements

### ✅ Build Configuration
- [x] Package name: `com.g88.app`
- [x] Release keystore created: `g88-release-key.keystore`
- [x] Signing config in build.gradle
- [x] ProGuard enabled with rules
- [x] Hermes enabled for performance
- [x] ARM architectures only (armeabi-v7a, arm64-v8a)
- [ ] Version code incremented before each release
- [ ] Production API URL configured

### ✅ App Assets
- [x] App icon (all densities: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- [x] Round icon variant
- [ ] Feature graphic (1024 x 500 px)
- [ ] Screenshots (min 2, max 8 per device type)
  - [ ] Phone screenshots (16:9 or 9:16)
  - [ ] 7-inch tablet (optional)
  - [ ] 10-inch tablet (optional)
- [ ] Promotional video (optional, YouTube URL)

### ✅ Required Legal Documents
- [x] Privacy Policy (docs/PRIVACY_POLICY.md)
- [ ] Privacy Policy hosted URL
- [ ] Terms of Service (recommended)
- [ ] EULA (if applicable)

---

## Google Play Console Setup

### 📱 App Information
- [ ] App name: "G88"
- [ ] Short description (80 characters max)
- [ ] Full description (4000 characters max)
- [ ] App category: Social → Dating (or appropriate)
- [ ] Contact email
- [ ] Contact phone (optional)
- [ ] Contact website (optional)

### 🔒 Data Safety Form (Required)
Answer these questions about data collection:

| Data Type | Collected? | Shared? | Purpose |
|-----------|------------|---------|---------|
| Location | Yes | No | App functionality |
| Personal info | Yes | No | Account management |
| Photos/media | Yes | No | User content |
| Messages | Yes | No | Communication |
| Device ID | Yes | No | Analytics |

### 📊 Content Rating
Complete IARC questionnaire covering:
- [ ] Violence
- [ ] Sexual content
- [ ] Language
- [ ] Controlled substances
- [ ] User interaction

**Expected Rating**: Mature 17+ (for dating apps)

### 💰 Pricing & Distribution
- [ ] Select countries for distribution
- [ ] Set as Free or Paid
- [ ] Accept Developer Distribution Agreement
- [ ] Accept US Export Laws compliance

---

## Testing Checklist

### 🧪 Pre-Release Testing
- [ ] Test release APK on physical device
- [ ] Test all authentication flows (Email, Google, Facebook, Apple)
- [ ] Test location permissions and discovery
- [ ] Test real-time messaging
- [ ] Test payment flows (Stripe)
- [ ] Test push notifications
- [ ] Verify analytics tracking
- [ ] Test crash reporting
- [ ] Performance testing under load

### 🔐 Security Verification
- [ ] API keys not exposed in code
- [ ] Keystore credentials secured
- [ ] Network security config proper
- [ ] SSL certificate pinning (optional)
- [ ] Sensitive data encrypted

---

## Build & Upload Process

### Step 1: Version Bump
```bash
cd mobile
node scripts/bump-version.js patch  # or minor/major
```

### Step 2: Build Release
```bash
# Windows
scripts\build-release.bat

# Mac/Linux
./scripts/build-release.sh
```

### Step 3: Upload to Play Console
1. Go to Google Play Console
2. Select "Production" track
3. Upload AAB file from `releases/` folder
4. Add release notes
5. Review and rollout

---

## Post-Release Monitoring

### 📈 Metrics to Track
- [ ] Install rate
- [ ] Crash-free users rate (target: >99%)
- [ ] ANR (App Not Responding) rate
- [ ] User ratings and reviews
- [ ] Uninstall rate

### 🛠 Incident Response
- [ ] Set up Crashlytics/Sentry alerts
- [ ] Monitor Play Console vitals
- [ ] Respond to user reviews
- [ ] Hotfix process documented

---

## Store Listing Copy (Draft)

### Short Description (80 chars)
```
Discover local connections. Date, shop, stream & stay informed with G88.
```

### Full Description (4000 chars)
```
G88 - Your Hyperlocal Social Discovery Platform

🌟 DISCOVER NEARBY
Find people, businesses, and events happening around you in real-time. 
Our intelligent location-based discovery puts your local community at 
your fingertips.

💕 MEET & CONNECT
Swipe through profiles of people nearby. Match based on shared interests, 
proximity, and compatibility. Start meaningful conversations with 
real-time messaging.

🛒 LOCAL MARKETPLACE
Buy and sell within your community. From vintage finds to daily essentials, 
discover local deals from verified sellers.

📺 LIVE STREAMING
Watch and broadcast live streams. Share moments, host events, and engage 
with your audience through interactive features.

📰 LOCAL NEWS & EVENTS
Stay informed about what's happening in your neighborhood. Never miss 
community events, local news, or trending topics.

✨ KEY FEATURES
• Real-time location-based discovery
• Secure messaging with read receipts
• Verified user profiles
• Virtual gifts and achievements
• Safe and private by design
• 24/7 moderation

🔒 PRIVACY FIRST
Your safety is our priority. We use end-to-end encryption, never sell 
your data, and give you full control over your visibility settings.

Download G88 today and discover what's happening around you!
```

---

## Timeline Estimate

| Task | Duration | Status |
|------|----------|--------|
| Technical prep | 1-2 days | ✅ Done |
| Store assets creation | 2-3 days | ⏳ Pending |
| Play Console setup | 1 day | ⏳ Pending |
| Internal testing | 2-3 days | ⏳ Pending |
| Google review | 3-7 days | ⏳ Pending |
| **Total** | **10-16 days** | |

---

## Emergency Contacts

- **Developer**: [Your email]
- **Play Console Support**: play.google.com/console/about/contact/
- **API Provider**: [Backend team contact]
