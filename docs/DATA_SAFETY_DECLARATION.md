# G88 Data Safety Declaration

This document helps complete the Google Play Data Safety form.

## Data Collection Summary

### Location Data
| Question | Answer |
|----------|--------|
| Is data collected? | Yes |
| Is data shared? | No |
| Is data encrypted in transit? | Yes |
| Can users request deletion? | Yes |
| Purpose | App functionality, Personalization |
| Optional/Required | Required for core features |

### Personal Information
| Question | Answer |
|----------|--------|
| Name | Collected, not shared |
| Email | Collected, not shared |
| Phone | Collected (optional), not shared |
| Date of birth | Collected, not shared |
| Gender | Collected, not shared |
| Purpose | Account management, App functionality |

### Photos and Videos
| Question | Answer |
|----------|--------|
| Is data collected? | Yes |
| Is data shared? | Yes (publicly visible in app) |
| Purpose | App functionality, User content |
| User control | Users can delete their uploads |

### Messages
| Question | Answer |
|----------|--------|
| Is data collected? | Yes |
| Is data shared? | No (only between chat participants) |
| Is data encrypted? | Yes (end-to-end for DMs) |
| Purpose | App functionality |

### Device or Other IDs
| Question | Answer |
|----------|--------|
| Is data collected? | Yes |
| Is data shared? | Yes (with analytics providers) |
| Purpose | Analytics, Crash reporting |
| Data type | Device ID, Advertising ID |

### App Activity
| Question | Answer |
|----------|--------|
| Is data collected? | Yes |
| Is data shared? | Yes (aggregated with analytics) |
| Purpose | Analytics, App improvement |
| Types | Page views, Taps, User interactions |

### Financial Information
| Question | Answer |
|----------|--------|
| Is data collected? | Yes (via Stripe) |
| Is data shared? | Yes (with Stripe for processing) |
| Purpose | Payments, Transactions |
| Note | Credit card data handled by Stripe, not stored by app |

---

## Third-Party SDKs and Data Sharing

### Firebase (Google)
- **Data shared**: Device info, App events, Crash logs
- **Purpose**: Analytics, Crash reporting, Authentication
- **Link**: https://firebase.google.com/support/privacy

### Google Maps
- **Data shared**: Location (when using maps)
- **Purpose**: Display maps, Location services
- **Link**: https://policies.google.com/privacy

### Stripe
- **Data shared**: Payment information
- **Purpose**: Payment processing
- **Link**: https://stripe.com/privacy

### Facebook SDK (optional login)
- **Data shared**: User profile (with consent)
- **Purpose**: Authentication
- **Link**: https://www.facebook.com/privacy/explanation

---

## Security Practices

| Practice | Implemented |
|----------|-------------|
| Data encrypted in transit | ✅ Yes (HTTPS/TLS) |
| Data encrypted at rest | ✅ Yes (database encryption) |
| Users can request data deletion | ✅ Yes (in-app account deletion) |
| Data retention policy | 30 days after account deletion |
| Independent security review | 🔄 Planned |

---

## Data Deletion Instructions

Users can delete their data by:
1. Going to Settings → Account → Delete Account
2. Confirming deletion via email verification
3. All personal data removed within 30 days

Or by contacting: privacy@g88app.com
