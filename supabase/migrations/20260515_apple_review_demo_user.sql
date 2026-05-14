-- Apple App Review reviewer demo account.
-- DO NOT run as SQL — auth users go through Supabase GoTrue so the password
-- gets hashed correctly. Use the API:
--
--   curl -X POST https://zona-mundial.onrender.com/api/auth/register \
--     -H 'Content-Type: application/json' \
--     -d '{"email":"apple-review@cromos26.com","password":"AppleReview2026!","username":"apple-review"}'
--
-- Or via Supabase dashboard → Authentication → Users → Add user.
--
-- Live credentials given to Apple App Review:
--   Email:    apple-review@cromos26.com
--   Password: AppleReview2026!
--   User ID:  aeb67b77-e305-4057-8034-377001bc60b1
--   Role:     customer
--
-- Documented in App Store Connect → App Information → App Review Information.
-- Do not delete this account — reviewers re-check on every update.

SELECT 'See header comment — Apple review demo user is provisioned via API, not SQL.' AS notice;
