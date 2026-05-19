# Operations Runbook

## Payment checks

- Use Stripe live keys only in production.
- Configure the live webhook endpoint to `/api/billing/webhook`.
- Required events: `checkout.session.completed` and `checkout.session.expired`.
- A paid checkout should mark `PointPurchase.status` as `PAID`, create one `PointTransaction` of type `PURCHASE`, and increment `User.points`.
- If the browser never returns from Stripe, the webhook should still add Points.
- Replayed webhooks should not add Points twice because paid purchases are ignored after `status = PAID`.

## Manual support workflow

When a user reports missing Points:

1. Find the user by email in `User`.
2. Find recent rows in `PointPurchase` for that `userId`.
3. Compare the Stripe checkout session or receipt with `stripeCheckoutSessionId`.
4. If Stripe shows payment succeeded but the purchase is still `PENDING`, verify amount/currency/package.
5. Add Points with a database transaction: increment `User.points`, create `PointTransaction` with type `ADJUSTMENT`, and add a clear note.

When a user requests a refund:

1. Refund in Stripe first.
2. Mark the matching `PointPurchase.status` as `REFUNDED`.
3. If Points were already granted and should be removed, create a negative `PointTransaction` with type `REFUND` and decrement `User.points` without going below zero.

## Generation billing expectations

- Standard generation costs 1 Point.
- Style template generation costs 3 Points.
- Points are deducted only after RunPod returns image data, image post-processing succeeds, and object storage returns an image URL.
- Database deduction uses `updateMany` with `points >= generationCost`, so concurrent requests cannot spend below zero.
- Production needs `RUNPOD_API_KEY`, `RUNPOD_ENDPOINT_ID`, and the LoRA trigger/config values set as server-side environment variables.

## Storage and portfolio

- Generated images are stored in object storage and shown in the portfolio for 7 days.
- Expired portfolio records are deleted when the portfolio API is loaded.
- Object deletion failures should be investigated, but they should not block users from loading their portfolio.

## Production smoke test

1. Register a new account.
2. Buy Points with Stripe live checkout.
3. Confirm Points arrive through the webhook.
4. Generate once without template and confirm 1 Point is spent.
5. Generate once with template and confirm 3 Points are spent.
6. Try generation with insufficient Points and confirm it is blocked.
7. Upload an oversized reference image and confirm it is rejected.
8. Refresh the portfolio and confirm generated images appear.
