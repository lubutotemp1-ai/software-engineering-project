# Health Easy Portal - Enhanced Version 4.0

## 🎉 Major Updates (Version 4.0)

### ✨ New Features

#### 1. **UI Improvements**

- ✅ Changed font to **Josefin Sans** (elegant and modern)
- ✅ **Sidebar Toggle Menu** - Click the menu icon to expand/collapse sidebar
- ✅ **Fixed Chat Send Button** - Now fully visible and accessible
- ✅ **Password Management** - Change password and forgot password pages

#### 2. **Authentication & Security**

- ✅ **Change Password** - Authenticated users can update their password
- ✅ **Reset Password** - Forgot password flow with email verification
- ✅ **Password Reset Tokens** - Secure tokens with 1-hour expiration
- ✅ **Database Migration** - Switched from SQLite to PostgreSQL

#### 3. **Payment & Subscription System**

- ✅ **Stripe Integration** - Complete checkout flow
- ✅ **4 Subscription Plans**:
  - **Free**: 6 AI Diagnosis + 6 Health Education uses/month
  - **Pro**: 50 uses each ($9.99/month)
  - **Plus**: 150 uses each ($14.99/month)
  - **Max**: 500 uses each ($24.99/month)
- ✅ **Usage Tracking** - Per-user, per-month usage limits
- ✅ **Plan Management** - View and upgrade subscriptions

#### 4. **AI Services with Usage Limits**

- ✅ **AI Diagnosis** - Using **Google Gemini API**
  - Analyzes symptoms and provides preliminary assessment
  - Usage limited based on subscription plan
- ✅ **Health Education** - Using **OpenRouter API**
  - Generates educational content on health topics
  - Separate usage limit tracking
- ✅ **Usage Enforcement** - Prevents API calls when limit reached

#### 5. **Database Enhancements**

- ✅ **PostgreSQL** - Production-ready database on Render
- ✅ **New Tables**:
  - `plans` - Subscription plans with pricing
  - `subscriptions` - User subscriptions linked to Stripe
  - `ai_usage` - Monthly usage tracking
  - `password_reset_tokens` - Password recovery tokens
- ✅ **Updated `users` table** - Added `subscription_plan` field

---

## 📋 Complete Feature List

### Patient Features

- ✓ User registration and login
- ✓ Dashboard with health overview
- ✓ Book and manage appointments
- ✓ Health tracker (vitals, medications, records)
- ✓ AI-powered diagnosis with Gemini
- ✓ Health education with OpenRouter
- ✓ Real-time messaging with doctors
- ✓ View medical records
- ✓ Subscription management
- ✓ Change password / Reset password

### Doctor Features

- ✓ Doctor login and dashboard
- ✓ Manage appointments
- ✓ View patient diagnoses
- ✓ Send treatment notes
- ✓ Real-time messaging with patients
- ✓ Schedule management

### Admin Features

- ✓ Admin dashboard
- ✓ User management
- ✓ Doctor management
- ✓ Content management
- ✓ System analytics

---

## 🚀 Deployment

### Backend (Render)

- **Runtime**: Node.js
- **Database**: PostgreSQL (Render)
- **Start Command**: `npm start`
- **Build Command**: `npm install`

### Frontend (Netlify)

- **Build**: `npm run build`
- **Publish**: `build` folder
- **Runtime**: React 18

**See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed setup instructions.**

---

## 🔑 Environment Variables

### Backend (.env)

```
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_key
GEMINI_API_KEY=your_key
OPENROUTER_API_KEY=sk-or-v1-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://yourdomain.netlify.app
```

### Frontend (.env)

```
REACT_APP_API_URL=https://your-render-api.onrender.com
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_...
```

---

## 🛠 Tech Stack

### Frontend

- React 18
- Axios (HTTP client)
- Lucide Icons
- CSS3 (Glassmorphism)

### Backend

- Express.js
- PostgreSQL (pg)
- JWT (jsonwebtoken)
- Stripe API
- Google Gemini API
- OpenRouter API
- bcryptjs (password hashing)

---

## 📱 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new patient
- `POST /api/auth/login` - Patient login
- `POST /api/auth/doctor-login` - Doctor login
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/request-password-reset` - Request reset code
- `POST /api/auth/reset-password` - Reset with code

### AI Services

- `POST /api/diagnosis/check` - AI diagnosis (with usage limits)
- `GET /api/diagnosis/history` - Get past diagnoses
- `POST /api/health-education/generate` - Generate health content (with usage limits)
- `GET /api/health-education/materials` - Get all materials

### Payments

- `GET /api/payments/plans` - List subscription plans
- `GET /api/payments/subscription` - Get current subscription
- `POST /api/payments/create-checkout-session` - Start Stripe checkout
- `POST /api/payments/webhook` - Stripe webhook (auto-called)

### Other

- `GET /api/appointments` - Get appointments
- `POST /api/chat/send` - Send message
- `GET /api/health` - Get health records
- And more...

---

## 🎨 Design System

### Font

- **Primary**: Josefin Sans (elegant, readable)
- **Code**: JetBrains Mono

### Colors

- **Primary Blue**: #2563EB
- **Success Green**: #10B981
- **Error Red**: #EF4444
- **Neutral Grays**: #F9FAFB to #111827

### Components

- Glassmorphism effects
- Smooth transitions
- Responsive design
- Accessibility focused

---

## 🔍 Key Improvements

1. **Security**: Password reset tokens, hashed passwords, JWT auth
2. **Scalability**: PostgreSQL replaces SQLite
3. **Monetization**: Full Stripe integration
4. **AI Integration**: Dual API support (Gemini & OpenRouter)
5. **User Experience**: Collapsible sidebar, better chat UX
6. **Accountability**: Usage tracking per user/month

---

## 📖 Documentation

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Full deployment instructions
- [backend/.env.example](./backend/.env.example) - Backend environment template
- [frontend/.env.example](./frontend/.env.example) - Frontend environment template

---

## 🧪 Testing

### Test Stripe Payments (Development)

- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

### Test AI APIs

- Try AI Diagnosis with sample symptoms
- Monitor usage counter
- Verify limits enforced after threshold

---

## 📊 Database Schema Highlights

### Plans Table

```sql
- id (PRIMARY KEY)
- name (Free, Pro, Plus, Max)
- price (0, 9.99, 14.99, 24.99)
- ai_diagnosis_limit (6, 50, 150, 500)
- health_education_limit (6, 50, 150, 500)
- stripe_price_id
```

### AI Usage Table

```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- service_type (diagnosis, health_education)
- usage_count
- period_start (month start)
- period_end (month end)
```

---

## 🐛 Known Issues

None currently. Please report any issues you find!

---

## 📝 Future Enhancements

- [ ] Email notifications for password reset
- [ ] SMS notifications for appointments
- [ ] Advanced analytics dashboard
- [ ] Prescription management
- [ ] Lab report integration
- [ ] Telemedicine video calls
- [ ] Mobile app (React Native)

---

## 📞 Support & Questions

For deployment or setup questions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

**Version**: 4.0.0  
**Last Updated**: May 2026  
**Status**: Production Ready ✅
