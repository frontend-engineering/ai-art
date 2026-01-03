# User Authentication Service

## Overview

This service implements the user authentication system for the AI Family Photo application. It manages user ID generation, storage, and session management.

## Features

### Frontend (Client-side)

1. **User ID Generation** (`src/lib/auth.ts`)
   - Generates UUID v4 for new users
   - Stores user ID in localStorage
   - Retrieves existing user ID on subsequent visits
   - Provides utilities to check and clear user ID

2. **User Context** (`src/contexts/UserContext.tsx`)
   - React Context for managing user session state
   - Provides user information throughout the application
   - Handles user initialization and updates
   - Manages loading and error states

3. **API Client** (`src/lib/api.ts`)
   - Communicates with backend user endpoints
   - Provides typed interfaces for user data
   - Handles API errors gracefully

### Backend (Server-side)

1. **User Service** (`backend/services/userService.js`)
   - Creates new users in the database
   - Retrieves user information by ID
   - Updates user payment status
   - Manages regenerate count
   - Provides get-or-create functionality

2. **API Endpoints** (`backend/server.js`)
   - `POST /api/user/init` - Initialize user (create or get)
   - `GET /api/user/:userId` - Get user information
   - `PUT /api/user/:userId/payment-status` - Update payment status

## Database Schema

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  payment_status ENUM('free', 'basic', 'premium') DEFAULT 'free',
  regenerate_count INT DEFAULT 3
);
```

## Usage

### Frontend

```typescript
import { useUser } from '@/contexts/UserContext';

function MyComponent() {
  const { user, loading, error, refreshUser, updatePaymentStatus } = useUser();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <p>User ID: {user?.id}</p>
      <p>Status: {user?.payment_status}</p>
      <p>Regenerate Count: {user?.regenerate_count}</p>
    </div>
  );
}
```

### Backend

```javascript
const userService = require('./services/userService');

// Create or get user
const user = await userService.getOrCreateUser(userId);

// Update payment status
await userService.updateUserPaymentStatus(userId, 'premium');

// Decrement regenerate count
await userService.decrementRegenerateCount(userId);
```

## Testing

Run frontend tests:
```bash
pnpm test
```

All authentication tests are located in `src/lib/__tests__/auth.test.ts`.

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 5.1**: User ID generation and storage
  - ✅ Frontend generates UUID and stores in localStorage
  - ✅ Backend creates users table record

- **Requirement 5.2**: User session management
  - ✅ Frontend reads localStorage user ID
  - ✅ Backend queries user information by ID
  - ✅ React Context manages user state globally

## Next Steps

1. Ensure MySQL database is running and configured
2. Run database migrations: `npm run db:migrate` (in backend directory)
3. Test the complete flow with backend server running
4. Integrate user authentication with other features (payment, generation history)
