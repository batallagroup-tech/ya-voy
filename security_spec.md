# Security Specification for Ya Voy - Repartidor

## Data Invariants
1. A user can only access their own profile (except admins).
2. A user can only see withdrawals they requested.
3. A driver can only see orders that are available (status 'ready') or orders they are already delivering.
4. A driver can only update orders they are delivering or orders they are taking.
5. A user can only see messages for orders they are a part of (clientId, restaurantId, or repartidorId).
6. Vehicles can only be added to a user's own profile.
7. Registration requests are private to the user and admins.

## The Dirty Dozen (Attacker Payloads)

1. **Identity Spoofing**: User A tries to read User B's profile.
2. **Role Escalation**: User A tries to update their own `role` to 'admin'.
3. **Verification Bypass**: User A tries to update their own `verified` status to true.
4. **Keyword Injection**: Driver tries to set `isRestaurantVerified: true` without the correct keyword.
5. **Balance Manipulation**: User tries to update their own `balance` field.
6. **Debt Deletion**: User tries to clear their `debt` field.
7. **Order Snatching**: Driver A tries to take an order already assigned to Driver B.
8. **Shadow Field Injection**: User tries to add a `isApproved: true` field to a vehicle request.
9. **Chat Eavesdropping**: User A tries to read messages for an order they are not involved in.
10. **Withdrawal Spoofing**: User A tries to create a withdrawal request for User B.
11. **Toxic ID Poisoning**: User tries to create a vehicle with an ID that is 2KB long.
12. **Timestamp Fraud**: User tries to set `createdAt` to a date in the past instead of `request.time`.

## Test Runner (Simplified logic)
- `get(/users/B)` as User A -> DENIED
- `update(/users/A, {role: 'admin'})` as User A -> DENIED
- `update(/orders/1, {isRestaurantVerified: true})` -> Should only be allowed if logic within the app is correct, but rules must guard the fields.
- `list(/withdrawals)` -> Should only return User A's withdrawals if filter matches UID.
