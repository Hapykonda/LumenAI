# LumenAI Business Authorization

## Purpose

Every authenticated LumenAI module uses one server-side business context.
Business selection and business access are separate decisions: a profile may
select a business, but only an active membership grants access.

The public widget is outside this contract. It is authorized with a public key,
visitor identity, origin controls, and rate limits.

## Contract

`getAuthorizedBusinessContext()` returns:

- `userId`
- `businessId`
- `membershipId`
- `role`
- `permissions`
- `activeBusiness`
- `user`
- `authenticatedSupabaseClient`
- `admin`

The service-role client is returned only after the user, selected business,
active membership, role, and optional permission have been checked.

## Resolution flow

1. Validate the bearer token or server cookie with Supabase Auth `getUser()`.
2. Read the user's profile by authenticated user ID.
3. Select `active_business_id`; accept `business_id` only as an explicit legacy
   transition field.
4. Reject a requested client business ID when it differs from the selection.
5. Load the selected business and the exact user/business membership in
   parallel.
6. Require business availability and membership status `active`.
7. Resolve role permissions and enforce the optional required permission.
8. Return the authorized context.

There is no owner-table scan, first-row fallback, user metadata authorization,
or browser-provided user ID.

## Roles

| Role | Effective application permissions |
| --- | --- |
| Owner | Business read/write, resources read/write, permission management |
| Admin | Business read/write, resources read/write, permission management |
| Manager | Business read/write, resources read/write |
| Member | Business read, resources read/write |
| Viewer | Business read, resources read |

Lumenite capability and autonomy decisions remain a second authorization layer
in `lumenai_agent_policies`; membership alone does not approve an agent action.

## Errors

| Code | HTTP | Meaning |
| --- | ---: | --- |
| `UNAUTHENTICATED` | 401 | Session missing, expired, or invalid |
| `BUSINESS_NOT_SELECTED` | 403 | Profile has no explicit business context |
| `MEMBERSHIP_REQUIRED` | 403 | User has no membership for the selection |
| `BUSINESS_MISMATCH` | 409 | Client/resource business differs from context |
| `PERMISSION_DENIED` | 403 | Role lacks the required permission |
| `RESOURCE_NOT_FOUND` | 404 | Selected business/resource no longer exists |
| `MEMBERSHIP_INACTIVE` | 403 | Membership or business is not active |

## Verification

Run:

```bash
npm run test:authorization
npm run test:authorization:integration
```

The integration test creates isolated users and businesses, validates positive
owner access and negative mismatch/membership/anonymous cases, and removes all
fixtures in a `finally` cleanup. It does not call external providers or execute
Lumenite actions.

