# Returns and refunds — phase-two demo

This is an owner-reviewed demo policy for client review, not a claim that every store uses the same rules. The customer-facing policy can be opened on every order page.

## Default policy

- Unopened, sealed change-of-mind requests: 14 days from the order’s latest recorded delivery. Set `RETURN_WINDOW_DAYS` in the backend environment to change it (1–365 days).
- Damaged, incorrect, missing, or quality concerns: submitted separately for review, without the change-of-mind time limit or unopened requirement. Statutory rights are unaffected. Requests currently select delivered units; other delivery problems should be handled through customer support.
- Approval is required before goods are sent back. The owner supplies the real return address and decides shipping arrangements in their customer response. No demo address is presented as a real returns destination.
- No automatic refund or restocking occurs when a customer submits a request.
- Staff can approve a physical return, approve a resolution without requiring goods back, or decline with an explanation. These decisions do not automatically issue a refund.

NZ context: change-of-mind rights depend on the store’s voluntary policy, while remedies for faulty goods are separate. Review the final policy with the client before launch: [Consumer Protection: change of mind](https://www.consumerprotection.govt.nz/general-help/common-consumer-issues/change-of-mind), [faulty and unsafe products](https://www.consumerprotection.govt.nz/general-help/common-consumer-issues/faulty-and-unsafe-products).

## Prepare an existing checkout demo

Stop the demo, run `npm run demo:setup` once to apply the additive migrations and create the quarantine location, then `npm run demo`. Existing products, customers and orders are preserved. A fresh installation follows the same setup instructions in README.

## Customer journey

1. Open a delivered order through its guest receipt session, or sign in with its owning account. Earlier guest orders can be linked after email verification.
2. In **A little care, continued**, choose **Request a return or report an issue**.
3. Select item quantities, reason, and a description. Change-of-mind requests also require confirmation that the goods are unopened and sealed.
4. Submit once. The order shows **Requested** and the local inbox receives a notification. Retries with the same request key do not create duplicate cases. Pending requests can be withdrawn.
5. Refresh the order to see the owner’s response, native return receipt status, and actual refund entries. Partial and full refunds are shown as separate amounts, with originally paid, refunded, and net paid totals.

Requests cannot exceed delivered units or units already held by another pending/approved request or native Medusa return. Rejected and withdrawn requests release their quantities. Approved no-return resolutions keep those units claimed.

## Owner journey

1. In Medusa Admin, open **Returns & care**. Review the items, reason, customer explanation, and sealed-product declaration.
2. Choose **Review request**, decision and resolution. For a physical return, choose **Ceylon returns — quarantine**. Write an explanation and specific return instructions, then save.
3. Physical approval creates a native Medusa return on the order. Use **Open order — receive return / manage refunds** to inspect and record receipt in the native order controls. Partial receipt is shown separately from complete receipt.
4. Returned food belongs in quarantine, not directly in sellable inventory. The seeded quarantine location has inventory levels but is not linked to a selling sales channel. Receipt there cannot increase storefront stock. Inspect/dispose goods or follow the client’s approved food handling process before any inventory transfer. For newly added tracked variants, add their inventory level at the quarantine location before receiving a return.
5. After review, use the native order **Payments → Refund** controls to issue a partial or full refund, within the captured balance. Decide whether delivery charges should be included. A refund can also be issued without a physical return, independently of the customer case. Do not refund twice; check the order’s existing refund entries first.
6. Refresh the customer’s order: recorded refunds and payment status come from Medusa, rather than an editable case flag. A received return is not presented as a completed refund.

The manual payment provider used by this demo records refunds but moves no money. A production payment provider must support refunds, and email delivery must be configured before launch. Request, review, and refund-update emails are captured in the local demo inbox. Refund totals count provider-confirmed entries; processing entries are shown separately. The native Medusa Admin remains the authority for receipts, payments, and refunds.

## Configuration and security

- `backend/src/modules/aftercare` owns the return-request records and committed migrations.
- The native public Store API return-creation route is blocked so customers cannot bypass approval.
- Next.js validates the guest receipt proof or account ownership before allowing aftercare reads/writes. Guest receipts work without creating an account; a new browser requires account login and ownership of the order.
- Next.js signs short-lived, order-scoped server-to-server requests using `AFTERCARE_API_SECRET`. For manual hosting, set the same strong secret in Next.js and Medusa. Local demo scripts supply the generated secret automatically. Do not expose it as a `NEXT_PUBLIC_` variable.
- Owner decisions require native Medusa admin authentication. Requested quantities and policy checks are server-side, and per-order locking serializes simultaneous requests. Use distributed locking/event infrastructure for a multi-instance production deployment.

## Validation

With the demo running, `npm run test:medusa` covers desktop/mobile customer requests, owner review UI, native receipt, partial/full refunds, request replay, withdrawal, rejection, refund-only approval, privacy, and stock isolation. Tests create fictitious demo orders. `npm test` also covers policy configuration and date boundaries.
