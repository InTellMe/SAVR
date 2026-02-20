# Comprehensive Testing Plan

This document outlines the complete testing strategy for the SAVR application, implemented via GitHub Actions workflows.

## Overview

The testing infrastructure covers:
1. **Continuous Integration (CI)** - Code quality and build validation
2. **End-to-End Testing** - User journey validation
3. **API Integration Tests** - Backend functionality validation
4. **Security Scanning** - Vulnerability detection
5. **Database Migration Validation** - Schema integrity
6. **Mobile Build Validation** - React Native app builds

## GitHub Actions Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:** Pull requests and pushes to main
**Purpose:** Validate code quality and build success

**Jobs:**
- `lint-web` - ESLint validation for web app
- `typecheck-web` - TypeScript type checking for web app
- `build-web` - Next.js build validation
- `typecheck-mobile` - TypeScript type checking for mobile app  
- `lint-mobile` - ESLint validation for mobile app
- `check-migrations` - Supabase migration syntax validation
- `check-env-examples` - Environment variable documentation
- `check-secrets` - Prevent hardcoded secrets

**Success Criteria:**
- ✅ No linting errors
- ✅ No TypeScript errors
- ✅ Successful build
- ✅ All migrations apply cleanly
- ✅ No hardcoded secrets detected

### 2. E2E Tests Workflow (`.github/workflows/e2e-tests.yml`)

**Triggers:** Pull requests, pushes to main, manual dispatch
**Purpose:** Validate critical user journeys

**Infrastructure:**
- Playwright for browser automation
- Local Supabase instance
- Next.js development server

**Test Scenarios:**
1. User Authentication
   - Sign up with email/password
   - Sign in with email/password
   - Sign in with Google OAuth
   - Password reset flow
   
2. Inventory Management
   - Add inventory item
   - Edit inventory item
   - Delete inventory item
   - Upload image for inventory
   
3. Recipe Management
   - Create recipe manually
   - Generate recipe with AI
   - Edit recipe
   - Delete recipe
   - Share recipe
   
4. Meal Planning
   - Generate meal plan
   - Edit meal plan
   - Generate grocery list from meal plan
   
5. Subscription Flow
   - View pricing page
   - Navigate to Stripe checkout
   - Verify subscription status updates

**Artifacts:**
- Test screenshots
- Test videos
- Test reports

### 3. API Integration Tests (`.github/workflows/api-tests.yml`)

**Triggers:** Changes to API routes or lib files, manual dispatch
**Purpose:** Validate API endpoint functionality

**Test Coverage:**
- **AI Endpoints:**
  - `/api/ai/analyze-image` - Image analysis
  - `/api/ai/chat` - AI chat responses
  - `/api/ai/create-recipe` - Recipe generation
  - `/api/ai/create-meal-plan` - Meal plan generation
  - `/api/ai/create-grocery-list` - Grocery list generation
  - `/api/ai/scan-receipt` - Receipt scanning
  
- **Inventory Endpoints:**
  - `/api/inventory/deduct` - Inventory deduction
  
- **Stripe Endpoints:**
  - `/api/stripe/webhook` - Stripe webhook handling
  - `/api/stripe/portal` - Customer portal session creation
  
- **Transfer Endpoints:**
  - `/api/transfer/create-session` - Transfer session creation

**Validation:**
- ✅ Authentication required
- ✅ Rate limiting enforced
- ✅ Subscription tier checks
- ✅ Error handling
- ✅ Response format validation
- ✅ Database mutations verified

### 4. Security Scanning (`.github/workflows/security-scan.yml`)

**Triggers:** Pull requests, pushes, weekly schedule, manual dispatch
**Purpose:** Identify security vulnerabilities

**Scans:**
1. **CodeQL Analysis**
   - Static code analysis
   - Security vulnerability detection
   - Code quality issues
   
2. **Dependency Security Check**
   - `npm audit` for web and mobile
   - Trivy filesystem scanning
   - Known vulnerability database checks
   
3. **Secret Scanning**
   - TruffleHog for exposed secrets
   - Verified secrets only (reduces false positives)
   
4. **RLS Policy Validation**
   - Verify Row Level Security enabled
   - Lint database policies
   - Test RLS policy enforcement

**Alerts:**
- Security findings uploaded to GitHub Security tab
- SARIF reports for CodeQL integration
- Failed checks block PR merges

### 5. Database Migration Validation (`.github/workflows/db-migration-validation.yml`)

**Triggers:** Changes to migration files, manual dispatch
**Purpose:** Ensure database schema integrity

**Validations:**
1. **Migration Naming Convention**
   - Format: `YYYYMMDDHHMMSS_description.sql`
   - No duplicate timestamps
   
2. **Migration Application**
   - Migrations apply without errors
   - Fresh database starts successfully
   
3. **Schema Verification**
   - Required tables exist:
     - users
     - inventory  
     - recipes
     - meal_plans
     - grocery_lists
     - chat_history
     - shared_recipes
     - transfer_sessions
     - data_consent
     - images (ML labeling)
     - annotations (ML labeling)
     - categories (ML labeling)
   
4. **RLS Status**
   - Row Level Security enabled on all public tables
   - Policies exist for user data isolation
   
5. **Seed Data Testing**
   - Seed data applies successfully
   - Test users created
   - Sample data inserted

**Artifacts:**
- Migration report (schema diff)
- Database structure documentation

### 6. Vercel Deployment (`.github/workflows/vercel-deploy.yml`)

**Triggers:** Pushes to main
**Purpose:** Deploy web app to production

**Steps:**
1. Pull Vercel environment configuration
2. Build Next.js application
3. Deploy to Vercel
4. Run database migrations on Supabase

**Environment Variables:**
- Supabase URL and keys
- Stripe keys
- OpenAI API key (server-side only)
- App URL

### 7. Preview Deployment (`.github/workflows/preview-deploy.yml`)

**Triggers:** Pull requests with web changes
**Purpose:** Deploy preview environments

**Features:**
- Preview URL generated for each PR
- Comment posted on PR with preview link
- Isolated environment for testing
- Automatic cleanup when PR closes

### 8. Mobile Build (`.github/workflows/mobile-build.yml`)

**Triggers:** Pushes to main (mobile changes), manual dispatch
**Purpose:** Build and submit mobile app

**Platforms:**
- Android (via EAS Build)
- iOS (via EAS Build)

**Profiles:**
- `development` - Development builds
- `preview` - Internal testing builds
- `production` - App store releases

**Submission:**
- Automatic submission to Google Play (internal track)
- Manual submission to App Store (requires approval)

## Local Testing

### Running Tests Locally

```bash
# Web app linting and type checking
cd web
npm run lint
npx tsc --noEmit

# Mobile app type checking
cd mobile
npx tsc --noEmit

# Run Supabase locally for testing
supabase start
supabase db reset --local

# Run E2E tests (if configured)
cd e2e-tests
npm run test
```

### Setting Up Test Environment

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Start local Supabase:
   ```bash
   supabase start
   ```

3. Apply migrations:
   ```bash
   supabase db reset --local
   ```

4. Get local credentials:
   ```bash
   supabase status
   ```

## Test Data Management

### Seed Data
- Location: `supabase/seed.sql`
- Contains: Sample users, recipes, inventory items
- Applied automatically in test environments

### Test Users
- Email: `test@example.com`
- Password: `testpassword123`
- Tier: Basic (for testing rate limits)

## Monitoring and Alerts

### GitHub Actions Notifications
- Slack notifications for failed builds (configure in repo settings)
- Email notifications for security findings
- PR status checks block merges on failure

### Security Alerts
- Dependabot for dependency updates
- CodeQL for code vulnerabilities
- Secret scanning for exposed credentials

## Coverage Goals

### Code Coverage Targets
- API Routes: > 80%
- Database Functions: > 70%
- Utility Functions: > 60%

### Test Distribution
- Unit Tests: 60%
- Integration Tests: 30%
- E2E Tests: 10%

## Continuous Improvement

### Regular Reviews
- Weekly security scan results review
- Monthly test coverage analysis
- Quarterly test strategy refinement

### Adding New Tests
1. Identify critical user journey
2. Write E2E test in Playwright
3. Add to `e2e-tests` directory
4. Update this documentation

### Deprecating Tests
1. Archive obsolete tests
2. Document reason for removal
3. Update test count metrics

## Troubleshooting

### Common Issues

**Supabase fails to start in CI:**
- Ensure Docker is available
- Check Supabase CLI version
- Verify port availability (5432, 54321)

**Migrations fail to apply:**
- Check migration file syntax
- Verify migration order
- Look for duplicate timestamps

**E2E tests flaky:**
- Add explicit waits for async operations
- Use Playwright's auto-waiting features
- Increase timeout for slow operations

**Security scan false positives:**
- Add exceptions to `.trivyignore`
- Update CodeQL query filters
- Document accepted risks

## Best Practices

### Writing Tests
- ✅ Test user behavior, not implementation
- ✅ Use meaningful test names
- ✅ Keep tests isolated and independent
- ✅ Clean up test data after execution
- ✅ Use factories for test data generation

### Maintaining Tests
- 🔄 Update tests when features change
- 🔄 Refactor duplicate test code
- 🔄 Keep test dependencies updated
- 🔄 Review and remove flaky tests

### Security
- 🔒 Never commit real API keys
- 🔒 Use test-specific Stripe keys
- 🔒 Rotate test credentials regularly
- 🔒 Limit test user permissions

## Future Enhancements

### Planned Additions
- [ ] Visual regression testing
- [ ] Performance testing (Lighthouse CI)
- [ ] Load testing for API endpoints
- [ ] Cross-browser E2E tests
- [ ] Mobile E2E tests (Detox/Appium)
- [ ] Mutation testing
- [ ] Contract testing for APIs

### Infrastructure Improvements
- [ ] Parallel test execution
- [ ] Test result caching
- [ ] Faster Supabase startup
- [ ] GitHub Actions runner optimization

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Supabase Testing Guide](https://supabase.com/docs/guides/local-development)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [CodeQL Documentation](https://codeql.github.com/docs/)

## Support

For questions or issues with the testing infrastructure:
1. Check this documentation
2. Review GitHub Actions logs
3. Search existing GitHub issues
4. Create new issue with `testing` label
