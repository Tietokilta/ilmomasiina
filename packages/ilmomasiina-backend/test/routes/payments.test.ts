import moment from "moment";
import { Op } from "sequelize";
import Stripe from "stripe";
import { testEvent, testSignups } from "test/testData";
import { beforeAll, beforeEach, describe, expect, Mock, test, vi } from "vitest";

import {
  ErrorCode,
  PaymentMode,
  PaymentStatus,
  QuestionType,
  SignupPaymentStatus,
} from "@tietokilta/ilmomasiina-models";
import config from "../../src/config";
import { Answer } from "../../src/models/answer";
import { Payment } from "../../src/models/payment";
import { Question } from "../../src/models/question";
import { Signup } from "../../src/models/signup";
import { checkoutSessionStatusUpdated, expirePaymentForSignupUpdate, getStripe } from "../../src/routes/payment/stripe";
import { deferred } from "../deferred";
import * as api from "./api";

// Mock Stripe API methods
let mockStripeCheckoutSessionCreate: Mock<Stripe.Checkout.SessionsResource["create"]>;
let mockStripeCheckoutSessionExpire: Mock<Stripe.Checkout.SessionsResource["expire"]>;
let mockStripeCheckoutSessionRetrieve: Mock<Stripe.Checkout.SessionsResource["retrieve"]>;
let mockStripeWebhookConstructEvent: Mock<Stripe.Webhooks["constructEvent"]>;

type MockCheckoutSession = Pick<Stripe.Checkout.Session, "id" | "status" | "url">;

let nextMockId = 123;
const mockCheckoutSessions = new Map<string, MockCheckoutSession>();

function createMockCheckoutSession(): Stripe.Response<Stripe.Checkout.Session> {
  const id = `cs_test_${nextMockId}`;
  nextMockId += 1;
  const session: MockCheckoutSession = {
    id,
    url: `https://checkout.stripe.test/pay/${id}`,
    status: "open",
  };
  mockCheckoutSessions.set(id, session);
  return session as Stripe.Response<Stripe.Checkout.Session>;
}

beforeAll(async () => {
  // Import the actual payment module to get access to the Stripe client
  const stripe = getStripe();

  // Mock the Stripe API methods
  mockStripeCheckoutSessionCreate = vi.spyOn(stripe.checkout.sessions, "create");
  mockStripeCheckoutSessionExpire = vi.spyOn(stripe.checkout.sessions, "expire");
  mockStripeCheckoutSessionRetrieve = vi.spyOn(stripe.checkout.sessions, "retrieve");
  mockStripeWebhookConstructEvent = vi.spyOn(stripe.webhooks, "constructEvent");
});

beforeEach(() => {
  if (mockStripeCheckoutSessionCreate) {
    mockStripeCheckoutSessionCreate.mockClear();
    mockStripeCheckoutSessionExpire.mockClear();
    mockStripeCheckoutSessionRetrieve.mockClear();
    mockStripeWebhookConstructEvent.mockClear();

    // Default mock implementation for creating checkout sessions
    mockStripeCheckoutSessionCreate.mockImplementation(async () => createMockCheckoutSession());
    // Default mock implementation for expiring checkout sessions
    mockStripeCheckoutSessionExpire.mockImplementation(async (sessionId) => {
      const session = mockCheckoutSessions.get(sessionId);
      if (!session) {
        throw new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error" });
      }
      if (session.status !== "open") {
        throw new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error" });
      }
      session.status = "expired";
      return session as Stripe.Response<Stripe.Checkout.Session>;
    });

    // Default mock implementation for retrieving checkout sessions
    mockStripeCheckoutSessionRetrieve.mockImplementation(async (sessionId) => {
      const session = mockCheckoutSessions.get(sessionId);
      if (!session) {
        throw new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error" });
      }
      return session as Stripe.Response<Stripe.Checkout.Session>;
    });

    // Default mock implementation for webhook event construction: always pass
    mockStripeWebhookConstructEvent.mockImplementation((body) => JSON.parse(body as string) as Stripe.Event);
  }
});

/** Creates a test event and signup for the most common payment test cases. */
async function defaultTestEventAndSignup() {
  const event = await testEvent(
    {
      quotaCount: 1,
      questionCount: 1,
      questionOverrides: {
        type: QuestionType.SELECT,
        options: ["Option A", "Option B"],
        prices: [1000, 2000],
        required: true,
      },
    },
    { payments: PaymentMode.ONLINE, nameQuestion: true, emailQuestion: true },
  );
  const [signup] = await testSignups(
    event,
    { count: 1, confirmed: true },
    { namePublic: false, language: "en" },
    { [event.questions![0].id]: "Option A" },
  );
  return { event, signup };
}

/** Directly creates a payment in the database, granting more control than startPayment() */
function createMockPayment(
  signup: Signup,
  status: PaymentStatus = PaymentStatus.PENDING,
  session?: MockCheckoutSession,
) {
  return Payment.create({
    signupId: signup.id,
    amount: signup.price!,
    currency: signup.currency!,
    products: signup.products!,
    expiresAt: moment().add(1, "hour").toDate(),
    status,
    stripeCheckoutSessionId: session?.id,
    completedAt: status === PaymentStatus.PAID || status === PaymentStatus.REFUNDED ? new Date() : null,
  });
}

describe("startPayment", () => {
  test("creates a new payment and Stripe checkout session", async () => {
    const { signup } = await defaultTestEventAndSignup();

    const [data, response] = await api.startPayment(signup.id);
    expect(response.statusCode).toBe(200);
    expect(data.paymentUrl).toEqual(expect.stringContaining("https://checkout.stripe.test/pay/"));

    // Verify payment was created in database
    const payment = await signup.getActivePayment();
    expect(payment).toBeTruthy();
    expect(payment!.status).toBe(PaymentStatus.PENDING);

    expect(mockStripeCheckoutSessionCreate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining<Stripe.Checkout.SessionCreateParams>({
        mode: "payment",
        ui_mode: "hosted",
        allow_promotion_codes: true,
        customer_email: signup.email!,
        success_url: expect.any(String),
        cancel_url: expect.any(String),
        expires_at: moment(payment.expiresAt).unix(),
        metadata: {
          signupId: payment.signupId,
          paymentId: String(payment.id),
        },
      }),
    );
  });

  test("reuses existing PENDING payment that is still open in Stripe", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create initial payment
    const [data, response] = await api.startPayment(signup.id);
    expect(response.statusCode).toBe(200);

    // Start payment again - should reuse existing payment
    const [data2, response2] = await api.startPayment(signup.id);
    expect(response2.statusCode).toBe(200);

    // Verify same payment URL returned
    expect(data2.paymentUrl).toBe(data.paymentUrl);

    // Verify only one payment exists
    expect(await Payment.count({ where: { signupId: signup.id } })).toBe(1);
    expect(mockStripeCheckoutSessionCreate).toHaveBeenCalledOnce();
    expect(mockStripeCheckoutSessionExpire).not.toHaveBeenCalled();
  });

  test("handles PENDING payment that has expired in Stripe", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create initial payment
    const [data, response] = await api.startPayment(signup.id);
    expect(response.statusCode).toBe(200);

    // Make the payment expired in Stripe
    const payment = await Payment.findOne({ where: { signupId: signup.id } });
    const session = mockCheckoutSessions.get(payment!.stripeCheckoutSessionId!);
    session!.status = "expired";

    // Start payment again - should create a new payment
    const [data2, response2] = await api.startPayment(signup.id);
    expect(response2.statusCode).toBe(200);
    expect(data2.paymentUrl).not.toBe(data.paymentUrl);

    // Verify two payments exist, first marked as EXPIRED
    const payments = await Payment.findAll({ where: { signupId: signup.id }, order: [["createdAt", "ASC"]] });
    expect(payments).toHaveLength(2);
    expect(payments[0].status).toBe(PaymentStatus.EXPIRED);
    expect(payments[1].status).toBe(PaymentStatus.PENDING);

    expect(mockStripeCheckoutSessionCreate).toHaveBeenCalledTimes(2);
    expect(mockStripeCheckoutSessionExpire).not.toHaveBeenCalled();
  });

  test("handles PENDING payment that has been paid in Stripe", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create initial payment
    const [, response] = await api.startPayment(signup.id);
    expect(response.statusCode).toBe(200);

    // Make the payment expired in Stripe
    const payment = await Payment.findOne({ where: { signupId: signup.id } });
    const session = mockCheckoutSessions.get(payment!.stripeCheckoutSessionId!);
    session!.status = "complete";

    // Start payment again - should error as already paid
    const result = await api.startPayment(signup.id);
    expect(result).toBeApiError(400, ErrorCode.SIGNUP_ALREADY_PAID);

    expect(mockStripeCheckoutSessionCreate).toHaveBeenCalledOnce();
    expect(mockStripeCheckoutSessionExpire).not.toHaveBeenCalled();
  });

  test("throws PaymentInProgress when CREATING payment exists", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a CREATING payment
    await createMockPayment(signup, PaymentStatus.CREATING);

    // Attempt to start payment - should fail
    const result = await api.startPayment(signup.id);
    expect(result).toBeApiError(409, ErrorCode.PAYMENT_IN_PROGRESS);

    expect(mockStripeCheckoutSessionCreate).not.toHaveBeenCalled();
  });

  test("throws SignupAlreadyPaid when PAID payment exists", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a PAID payment
    const session = await getStripe().checkout.sessions.create();
    await createMockPayment(signup, PaymentStatus.PAID, session);

    // Attempt to start payment - should fail
    const result = await api.startPayment(signup.id);
    expect(result).toBeApiError(400, ErrorCode.SIGNUP_ALREADY_PAID);

    expect(mockStripeCheckoutSessionCreate).toHaveBeenCalledOnce(); // in test setup
  });

  test("creates new payment when CREATION_FAILED, EXPIRED or REFUNDED payment exists", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create payments that should not block new payment creation
    const expiredSession = await getStripe().checkout.sessions.create();
    const refundedSession = await getStripe().checkout.sessions.create();
    await createMockPayment(signup, PaymentStatus.CREATION_FAILED);
    await createMockPayment(signup, PaymentStatus.EXPIRED, expiredSession);
    await createMockPayment(signup, PaymentStatus.REFUNDED, refundedSession);

    // Start payment - should create a new one
    const [, response] = await api.startPayment(signup.id);
    expect(response.statusCode).toBe(200);

    // Verify payment was created in database
    const payment = await signup.getActivePayment();
    expect(payment).toBeTruthy();
    expect(payment!.status).toBe(PaymentStatus.PENDING);

    expect(mockStripeCheckoutSessionCreate).toHaveBeenCalledTimes(3); // twice for test setup + once internally
    expect(mockStripeCheckoutSessionExpire).not.toHaveBeenCalled();
  });

  test("fails when signup is not confirmed", async () => {
    const { event } = await defaultTestEventAndSignup();
    const [signup] = await testSignups(event, { count: 1, confirmed: false });

    const result = await api.startPayment(signup.id);
    expect(result).toBeApiError(400, ErrorCode.SIGNUP_NOT_CONFIRMED);

    expect(await Payment.findOne({ where: { signupId: signup.id } })).toBeNull();
    expect(mockStripeCheckoutSessionCreate).not.toHaveBeenCalled();
  });

  test("fails when signup has no price", async () => {
    const event = await testEvent(
      { quotaCount: 2, questionCount: 0, quotaOverrides: { price: 0 } },
      { payments: PaymentMode.ONLINE, nameQuestion: true, emailQuestion: true },
    );
    await event.quotas![1].update({ price: 1000 }); // Make only one quota paid

    // Create a free signup
    const [signup] = await testSignups(event, { count: 1, confirmed: true, quotaId: event.quotas![0].id });
    expect(signup.price).toBe(0);

    // Attempt to start payment - should fail
    const result = await api.startPayment(signup.id);
    expect(result).toBeApiError(400, ErrorCode.PAYMENT_NOT_REQUIRED);

    expect(await Payment.findOne({ where: { signupId: signup.id } })).toBeNull();
    expect(mockStripeCheckoutSessionCreate).not.toHaveBeenCalled();
  });

  test("fails when event has online payments disabled", async () => {
    const { event, signup } = await defaultTestEventAndSignup();

    // Attempt to start payment in manual mode - should fail
    await event.update({ payments: PaymentMode.MANUAL });
    let result = await api.startPayment(signup.id);
    expect(result).toBeApiError(400, ErrorCode.ONLINE_PAYMENTS_DISABLED);

    // Attempt to start payment in non-payment mode - should fail
    await event.update({ payments: PaymentMode.DISABLED });
    result = await api.startPayment(signup.id);
    expect(result).toBeApiError(400, ErrorCode.ONLINE_PAYMENTS_DISABLED);

    expect(await Payment.findOne({ where: { signupId: signup.id } })).toBeNull();
    expect(mockStripeCheckoutSessionCreate).not.toHaveBeenCalled();
  });

  test.todo("fails when Stripe is not configured", async () => {
    // TODO: Test that starting payment when Stripe is not configured globally
    // throws OnlinePaymentsDisabled
  });

  test("fails gracefully when Stripe API errors", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Mock Stripe API to fail
    mockStripeCheckoutSessionCreate.mockRejectedValueOnce(new Stripe.errors.StripeAPIError({ type: "api_error" }));

    const result = await api.startPayment(signup.id, undefined, true);
    expect(result).toBeApiError(500);

    // Verify payment was marked as CREATION_FAILED
    const payment = await Payment.findOne({ where: { signupId: signup.id } });
    expect(payment!.status).toBe(PaymentStatus.CREATION_FAILED);
  });

  test("maps Stripe rate limit errors to 429", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Mock Stripe API to fail with rate limit error
    mockStripeCheckoutSessionCreate.mockRejectedValueOnce(
      new Stripe.errors.StripeRateLimitError({ type: "rate_limit_error" }),
    );

    const result = await api.startPayment(signup.id, undefined, true);
    expect(result).toBeApiError(429, ErrorCode.PAYMENT_RATE_LIMITED);

    // Verify payment was marked as CREATION_FAILED
    const payment = await Payment.findOne({ where: { signupId: signup.id } });
    expect(payment!.status).toBe(PaymentStatus.CREATION_FAILED);
  });

  test("can create multiple payments concurrently", async () => {
    const event = await testEvent(
      { quotaCount: 1, questionCount: 0 },
      { payments: PaymentMode.ONLINE, nameQuestion: true, emailQuestion: true },
    );
    const signups = await testSignups(event, { count: 5, confirmed: true });

    // Create payments for all signups concurrently
    const results = await Promise.all(signups.map((signup) => api.startPayment(signup.id)));

    // All should succeed with 200
    expect(results.every(([, response]) => response.statusCode === 200)).toBe(true);

    // Verify payments were created
    const payments = await Payment.findAll({ where: { signupId: { [Op.in]: signups.map((s) => s.id) } } });
    expect(payments).toHaveLength(signups.length);
    expect(new Set(payments.map((p) => p.signupId))).toEqual(new Set(signups.map((s) => s.id)));
    expect(payments.map((p) => p.status)).toEqual(signups.map(() => PaymentStatus.PENDING));
  });
});

describe("payment and signup update locking", () => {
  // TODO: These tests verify the correctness of the locking logic and state transitions,
  //  but they do NOT test true concurrent/parallel execution with simulated race conditions.

  test("signup update expires existing PENDING payment", async () => {
    const { event, signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Update signup
    const [, response] = await api.updateSignupAsUser(signup.id, {
      firstName: "Changed!",
      // Also change price/products
      answers: [{ questionId: event.questions![0].id, answer: "Option B" }],
    });
    expect(response.statusCode).toBe(200);

    // Verify the payment was expired
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.EXPIRED);
    expect(mockStripeCheckoutSessionExpire).toHaveBeenCalledExactlyOnceWith(payment!.stripeCheckoutSessionId!);
  });

  test("admin signup update expires existing PENDING payment", async () => {
    const { event, signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Admin update should succeed and expire the payment
    const [data, response] = await api.updateSignupAsAdmin(signup.id, {
      firstName: "AdminChanged!",
      answers: [{ questionId: event.questions![0].id, answer: "Option B" }],
    });
    expect(response.statusCode).toBe(200);
    expect(data.firstName).toBe("AdminChanged!");

    // Verify the payment was expired
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.EXPIRED);
    expect(mockStripeCheckoutSessionExpire).toHaveBeenCalledExactlyOnceWith(payment!.stripeCheckoutSessionId!);
  });

  test("signup deletion expires existing PENDING payment", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Delete signup
    const [, response] = await api.deleteSignupAsUser(signup.id);
    expect(response.statusCode).toBe(204);

    // Verify the payment was expired
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.EXPIRED);
    expect(mockStripeCheckoutSessionExpire).toHaveBeenCalledExactlyOnceWith(payment!.stripeCheckoutSessionId!);
  });

  test("admin signup deletion expires existing PENDING payment", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Admin delete signup
    const [, response] = await api.deleteSignupAsAdmin(signup.id);
    expect(response.statusCode).toBe(204);

    // Verify the payment was expired
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.EXPIRED);
    expect(mockStripeCheckoutSessionExpire).toHaveBeenCalledExactlyOnceWith(payment!.stripeCheckoutSessionId!);
  });

  test("signup update allowed when PAID and price/products unchanged", async () => {
    const { event, signup } = await defaultTestEventAndSignup();
    const originalPrice = signup.price;
    const originalProducts = signup.products;

    // Add a question without prices
    const newQuestion = await Question.create({
      eventId: event.id,
      question: "New question",
      type: QuestionType.SELECT,
      options: ["Option 1", "Option 2"],
      prices: null,
      required: true,
      order: 1,
    });

    // Create a payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });
    // Mark payment as PAID via webhook simulation
    await checkoutSessionStatusUpdated(payment!.stripeCheckoutSessionId!, "complete");
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PAID);

    // Update signup without changing price - should succeed
    await signup.reload({ include: [Answer] });
    const [, response] = await api.updateSignupAsUser(signup.id, {
      namePublic: true,
      // Make changes to answers too, but don't change the existing paid one
      answers: [
        { questionId: event.questions![0].id, answer: "Option A" },
        { questionId: newQuestion.id, answer: "Option 2" },
      ],
    });
    expect(response.statusCode).toBe(200);

    // Verify signup was changed
    await signup.reload({ include: [Answer] });
    expect(signup.namePublic).toBe(true);
    expect(signup.answers!.map((ans) => ans.answer)).toContain("Option A");
    expect(signup.answers!.map((ans) => ans.answer)).toContain("Option 2");
    // but price/products were not
    expect(signup.price).toBe(originalPrice);
    expect(signup.products).toEqual(originalProducts);

    // Payment status should remain PAID
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PAID);
  });

  test("signup update allowed when no active payment exists", async () => {
    const { event, signup } = await defaultTestEventAndSignup();
    const originalPrice = signup.price;
    const originalProducts = signup.products;

    // Create payments that should not block editing
    const expiredSession = await getStripe().checkout.sessions.create();
    const refundedSession = await getStripe().checkout.sessions.create();
    await createMockPayment(signup, PaymentStatus.CREATION_FAILED);
    await createMockPayment(signup, PaymentStatus.EXPIRED, expiredSession);
    await createMockPayment(signup, PaymentStatus.REFUNDED, refundedSession);

    // No active payment exists, so changing the price should be allowed
    const [, response] = await api.updateSignupAsUser(signup.id, {
      namePublic: true,
      answers: [{ questionId: event.questions![0].id, answer: "Option B" }],
    });
    expect(response.statusCode).toBe(200);

    // Verify answer and price was changed
    await signup.reload({ include: [Answer] });
    expect(signup.answers![0].answer).toBe("Option B");
    expect(signup.price).not.toBe(originalPrice);
    expect(signup.products).not.toEqual(originalProducts);
  });

  test("signup update blocked when PAID and price would change", async () => {
    const { event, signup } = await defaultTestEventAndSignup();
    const originalPrice = signup.price;
    const originalProducts = signup.products;

    // Create and pay for initial signup
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });
    await checkoutSessionStatusUpdated(payment!.stripeCheckoutSessionId!, "complete");

    // Attempt to change answer to different price option - should fail
    const result = await api.updateSignupAsUser(signup.id, {
      namePublic: true,
      answers: [{ questionId: event.questions![0].id, answer: "Option B" }],
    });
    expect(result).toBeApiError(400, ErrorCode.SIGNUP_ALREADY_PAID);

    // Verify answer was not changed
    await signup.reload({ include: [Answer] });
    expect(signup.namePublic).toBe(false);
    expect(signup.answers![0].answer).toBe("Option A");
    expect(signup.price).toBe(originalPrice);
    expect(signup.products).toEqual(originalProducts);

    // Payment status should remain PAID
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PAID);
  });

  test("admin signup update allowed even with PAID payment", async () => {
    const { event, signup } = await defaultTestEventAndSignup();

    // Create a payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });
    // Mark payment as PAID via webhook simulation
    await checkoutSessionStatusUpdated(payment!.stripeCheckoutSessionId!, "complete");

    // Verify user update is blocked when price changes
    const userResult = await api.updateSignupAsUser(signup.id, {
      namePublic: true,
      answers: [{ questionId: event.questions![0].id, answer: "Option B" }],
    });
    expect(userResult).toBeApiError(400, ErrorCode.SIGNUP_ALREADY_PAID);

    // Admin update should succeed even when changing price-related answers
    const [data, response] = await api.updateSignupAsAdmin(signup.id, {
      firstName: "AdminChanged!",
      answers: [{ questionId: event.questions![0].id, answer: "Option B" }],
    });
    expect(response.statusCode).toBe(200);
    expect(data.firstName).toBe("AdminChanged!");
    expect(data.paymentStatus).toBe(SignupPaymentStatus.PAID);

    // Verify signup was changed including price
    await signup.reload();
    expect(signup.firstName).toBe("AdminChanged!");

    // Payment status should remain PAID
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PAID);
  });

  test("signup deletion blocked when PAID payment exists", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Mark payment as PAID via webhook simulation
    await checkoutSessionStatusUpdated(payment!.stripeCheckoutSessionId!, "complete");
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PAID);

    // Attempt to delete signup - should fail
    const result = await api.deleteSignupAsUser(signup.id);
    expect(result).toBeApiError(400, ErrorCode.SIGNUP_ALREADY_PAID);

    // Will fail if deleted or soft deleted
    await signup.reload();
  });

  test("admin can delete signups even when PAID payment exists", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Mark payment as PAID via webhook simulation
    await checkoutSessionStatusUpdated(payment!.stripeCheckoutSessionId!, "complete");
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PAID);

    // Admin CAN now delete paid signups (soft delete)
    const [, response] = await api.deleteSignupAsAdmin(signup.id);
    expect(response.statusCode).toBe(204);

    // Verify it was soft-deleted
    await signup.reload();
    expect(signup.deletedAt).toBeTruthy();
  });

  test("signup update blocks ongoing payment creation by marking as CREATION_FAILED", async () => {
    const { event, signup } = await defaultTestEventAndSignup();

    const stripeMockRequest = deferred<void>();
    const stripeMockResponse = deferred<void>();
    mockStripeCheckoutSessionCreate.mockImplementationOnce(async () => {
      // Let the test proceed when called, then wait for signal to continue
      stripeMockRequest.resolve();
      await stripeMockResponse.promise;
      return createMockCheckoutSession();
    });

    // Start payment creation
    const startPaymentPromise = api.startPayment(signup.id);
    await stripeMockRequest.promise; // Wait until Stripe create is called

    // Verify payment exists in CREATING state
    const payment = await Payment.findOne({ where: { signupId: signup.id } });
    expect(payment).toBeTruthy();
    expect(payment!.status).toBe(PaymentStatus.CREATING);

    // Attempt signup update - should mark payment as CREATION_FAILED
    await api.updateSignupAsUser(signup.id, {
      namePublic: true,
      answers: [{ questionId: event.questions![0].id, answer: "Option B" }],
    });

    // Verify the payment was marked as CREATION_FAILED
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.CREATION_FAILED);

    // Pretend Stripe create responded - the creation should now fail due to CREATION_FAILED state
    stripeMockResponse.resolve();

    const result = await startPaymentPromise;
    expect(result).toBeApiError(409, ErrorCode.PAYMENT_IN_PROGRESS);
    expect(mockStripeCheckoutSessionCreate).toHaveBeenCalledOnce();
  });

  test("signup deletion blocks ongoing payment creation by marking as CREATION_FAILED", async () => {
    const { signup } = await defaultTestEventAndSignup();

    const stripeMockRequest = deferred<void>();
    const stripeMockResponse = deferred<void>();
    mockStripeCheckoutSessionCreate.mockImplementationOnce(async () => {
      // Let the test proceed when called, then wait for signal to continue
      stripeMockRequest.resolve();
      await stripeMockResponse.promise;
      return createMockCheckoutSession();
    });

    // Start payment creation
    const startPaymentPromise = api.startPayment(signup.id);
    await stripeMockRequest.promise; // Wait until Stripe create is called

    // Verify payment exists in CREATING state
    const payment = await Payment.findOne({ where: { signupId: signup.id } });
    expect(payment).toBeTruthy();
    expect(payment!.status).toBe(PaymentStatus.CREATING);

    // Attempt signup deletion - should mark payment as CREATION_FAILED
    await api.deleteSignupAsUser(signup.id);

    // Verify the payment was marked as CREATION_FAILED
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.CREATION_FAILED);

    // Pretend Stripe create responded - the creation should now fail due to CREATION_FAILED state
    stripeMockResponse.resolve();
    stripeMockResponse.resolve();

    const result = await startPaymentPromise;
    expect(result).toBeApiError(409, ErrorCode.PAYMENT_IN_PROGRESS);
    expect(mockStripeCheckoutSessionCreate).toHaveBeenCalledOnce();
  });

  test("signup update ignores Stripe errors when expiring session", async () => {
    const { event, signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);

    // Mock Stripe expire to fail with StripeInvalidRequestError
    mockStripeCheckoutSessionExpire.mockRejectedValueOnce(
      new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error" }),
    );

    // Update signup - should fail because payment couldn't be expired
    const result = await api.updateSignupAsUser(signup.id, {
      namePublic: true,
      answers: [{ questionId: event.questions![0].id, answer: "Option B" }],
    });

    // Should fail because the payment is still active
    expect(result).toBeApiError(409, ErrorCode.PAYMENT_IN_PROGRESS);
    expect(mockStripeCheckoutSessionExpire).toHaveBeenCalledOnce();
    expect(mockStripeCheckoutSessionCreate).toHaveBeenCalledOnce(); // No new payment created
  });

  test("end-to-end: update to expire payment, then pay again", async () => {
    const event = await testEvent(
      {
        quotaCount: 1,
        questionCount: 1,
        questionOverrides: { options: ["Option A", "Option B"], prices: [500, 1000] },
      },
      { payments: PaymentMode.ONLINE, nameQuestion: true, emailQuestion: true },
    );
    const [signup] = await testSignups(event, { count: 1, confirmed: true });

    // Create initial payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });
    expect(payment).toBeTruthy();
    expect(payment!.status).toBe(PaymentStatus.PENDING);

    // Update signup - expires old payment
    await api.updateSignupAsUser(signup.id, {
      namePublic: true,
      answers: [{ questionId: event.questions![0].id, answer: "Option B" }],
    });

    // Verify old payment is expired
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.EXPIRED);
    expect(mockStripeCheckoutSessionExpire).toHaveBeenCalledExactlyOnceWith(payment!.stripeCheckoutSessionId!);

    // Create new payment - should succeed
    const [data, response] = await api.startPayment(signup.id);
    expect(response.statusCode).toBe(200);
    expect(data.paymentUrl).toEqual(expect.stringContaining("https://checkout.stripe.test/pay/"));

    // Verify new payment was created
    const newPayment = await signup.getActivePayment();
    expect(newPayment).toBeTruthy();
    expect(newPayment!.id).not.toBe(payment!.id);
    expect(newPayment!.status).toBe(PaymentStatus.PENDING);
    expect(mockStripeCheckoutSessionCreate).toHaveBeenCalledTimes(2);
  });
});

describe("getEventDetailsForAdmin", () => {
  test("returns paid and refunded signups even when deleted", async () => {
    const { event, signup } = await defaultTestEventAndSignup();

    // Create a payment and mark it as PAID
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });
    await checkoutSessionStatusUpdated(payment!.stripeCheckoutSessionId!, "complete");

    // Delete the signup
    const [, response] = await api.deleteSignupAsAdmin(signup.id);
    expect(response.statusCode).toBe(204);

    // Verify it's still returned by the admin event API
    let [data] = await api.fetchAdminEventDetails(event);
    expect(data.quotas[0].signupCount).toBe(0); // Excludes deleted signups
    expect(data.quotas[0].signups.length).toBe(1);
    expect(data.quotas[0].signups[0].id).toBe(signup.id);
    expect(data.quotas[0].signups[0].paymentStatus).toBe(SignupPaymentStatus.PAID);

    // Mark the payment as REFUNDED
    await payment!.update({ status: PaymentStatus.REFUNDED });

    // Verify it's still returned by the admin event API
    [data] = await api.fetchAdminEventDetails(event);
    expect(data.quotas[0].signupCount).toBe(0); // Excludes deleted signups
    expect(data.quotas[0].signups.length).toBe(1);
    expect(data.quotas[0].signups[0].id).toBe(signup.id);
    expect(data.quotas[0].signups[0].paymentStatus).toBe(SignupPaymentStatus.REFUNDED);
  });

  test("returns correct paymentStatus when refunded and repaid", async () => {
    const { event, signup } = await defaultTestEventAndSignup();

    // Create a payment and mark it as PAID
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Verify initial paymentStatus is PENDING
    let [data] = await api.fetchAdminEventDetails(event);
    expect(data.quotas[0].signups[0].paymentStatus).toBe(SignupPaymentStatus.PENDING);

    // Mark payment as PAID
    await checkoutSessionStatusUpdated(payment!.stripeCheckoutSessionId!, "complete");

    // Verify paymentStatus is PAID
    [data] = await api.fetchAdminEventDetails(event);
    expect(data.quotas[0].signups[0].paymentStatus).toBe(SignupPaymentStatus.PAID);

    // Mark the payment as REFUNDED
    await payment!.update({ status: PaymentStatus.REFUNDED });

    // Verify paymentStatus is REFUNDED
    [data] = await api.fetchAdminEventDetails(event);
    expect(data.quotas[0].signups[0].paymentStatus).toBe(SignupPaymentStatus.REFUNDED);

    // Create a new payment
    await api.startPayment(signup.id);
    const newPayment = await Payment.findOne({ where: { signupId: signup.id, id: { [Op.ne]: payment!.id } } });

    // Verify paymentStatus is still REFUNDED (overrides PENDING)
    [data] = await api.fetchAdminEventDetails(event);
    expect(data.quotas[0].signups[0].paymentStatus).toBe(SignupPaymentStatus.REFUNDED);

    // Mark the new payment as PAID
    await checkoutSessionStatusUpdated(newPayment!.stripeCheckoutSessionId!, "complete");

    // Verify paymentStatus is PAID again
    [data] = await api.fetchAdminEventDetails(event);
    expect(data.quotas[0].signups[0].paymentStatus).toBe(SignupPaymentStatus.PAID);
  });
});

describe("completePayment", () => {
  test("refreshes PENDING payment and returns signup when complete", async () => {
    const { event, signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Mark the session as complete in Stripe
    const session = mockCheckoutSessions.get(payment!.stripeCheckoutSessionId!);
    session!.status = "complete";

    // Complete the payment
    const [data, response] = await api.completePayment(signup.id);
    expect(response.statusCode).toBe(200);
    expect(data).toEqual({
      event: expect.any(Object),
      signup: {
        id: signup.id,
        firstName: signup.firstName,
        lastName: signup.lastName,
        email: signup.email,
        namePublic: signup.namePublic,
        answers: expect.any(Array),
        confirmed: true,
        createdAt: signup.createdAt.toISOString(),
        quota: expect.any(Object),
        position: null,
        status: null,
        confirmableForMillis: 0,
        editableForMillis: expect.any(Number),
        price: payment!.amount, // important
        currency: payment!.currency, // important
        products: payment!.products, // important
        paymentStatus: SignupPaymentStatus.PAID, // important
        deletedAt: null,
      },
    });

    // Verify payment was marked as PAID
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PAID);
    expect(payment!.completedAt).toBeTruthy();
    expect(mockStripeCheckoutSessionRetrieve).toHaveBeenCalledWith(payment!.stripeCheckoutSessionId!);

    // Verify an email was sent
    expect(emailSend).toHaveBeenCalledExactlyOnceWith(
      signup.email,
      `Payment confirmation: ${event.title}`,
      expect.stringContaining("has been received"),
    );
  });

  test("throws PaymentNotComplete when PENDING payment is not complete", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);

    // Attempt to complete the payment - should fail
    const result = await api.completePayment(signup.id);
    expect(result).toBeApiError(400, ErrorCode.PAYMENT_NOT_COMPLETE);

    // Verify payment status unchanged
    const payment = await Payment.findOne({ where: { signupId: signup.id } });
    expect(payment!.status).toBe(PaymentStatus.PENDING);

    // Verify no email was sent
    expect(emailSend).not.toHaveBeenCalled();
  });

  test("handles PENDING payment that expired in Stripe", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Mark the session as expired in Stripe
    const session = mockCheckoutSessions.get(payment!.stripeCheckoutSessionId!);
    session!.status = "expired";

    // Attempt to complete the payment - should fail
    const result = await api.completePayment(signup.id);
    expect(result).toBeApiError(400, ErrorCode.PAYMENT_NOT_COMPLETE);

    // Verify payment was marked as EXPIRED
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.EXPIRED);

    // Verify no email was sent
    expect(emailSend).not.toHaveBeenCalled();
  });

  test("throws PaymentNotFound when no active payment exists", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Attempt to complete payment without creating one first
    const result = await api.completePayment(signup.id);
    expect(result).toBeApiError(400, ErrorCode.PAYMENT_NOT_FOUND);

    // Verify no email was sent
    expect(emailSend).not.toHaveBeenCalled();
  });

  test("handles payments already marked as PAID by webhook", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Mark the session as complete in Stripe
    const session = mockCheckoutSessions.get(payment!.stripeCheckoutSessionId!);
    session!.status = "complete";

    // Simulate webhook processing the payment first
    await checkoutSessionStatusUpdated(payment!.stripeCheckoutSessionId!, "complete");
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PAID);

    // Verify an email was sent
    expect(emailSend).toHaveBeenCalledOnce();

    // Now the user returns and completePayment is called
    // This should succeed and return the signup without errors
    const [data, response] = await api.completePayment(signup.id);
    expect(response.statusCode).toBe(200);
    expect(data.signup.id).toBe(signup.id);

    // Verify payment is still PAID
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PAID);

    // Verify exactly one email was sent
    expect(emailSend).toHaveBeenCalledOnce();
  });

  test("handles rate limit errors from Stripe", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Mock Stripe API to fail with rate limit error
    mockStripeCheckoutSessionRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeRateLimitError({ type: "rate_limit_error" }),
    );

    // Attempt to complete payment - should fail with 429
    const result = await api.completePayment(signup.id, undefined, true);
    expect(result).toBeApiError(429, ErrorCode.PAYMENT_RATE_LIMITED);

    // Verify payment status unchanged
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PENDING);

    // Verify no email was sent
    expect(emailSend).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook", () => {
  test("handles valid webhooks and ignores unknown event types", async () => {
    const mockEvent = {
      type: "person.deleted",
      data: { object: { first_name: "Veijo", last_name: "Tietokilta" } },
    } as Stripe.Event;

    // Default implementation: should pass but be ignored
    const response = await api.stripeWebhook(JSON.stringify(mockEvent), "t=12345,v1=fakesignature");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });
    expect(mockStripeWebhookConstructEvent).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify(mockEvent)),
      "t=12345,v1=fakesignature",
      config.stripeWebhookSecret,
    );
  });

  test("handles checkout.session.completed event", async () => {
    const { event, signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Send webhook event for checkout.session.completed
    const mockEvent = {
      type: "checkout.session.completed",
      data: { object: { id: payment!.stripeCheckoutSessionId } },
    } as Stripe.Event;

    const response = await api.stripeWebhook(JSON.stringify(mockEvent), "t=12345,v1=fakesignature");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });

    // Verify payment was marked as PAID
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PAID);
    expect(payment!.completedAt).toBeTruthy();

    // Verify an email was sent
    expect(emailSend).toHaveBeenCalledExactlyOnceWith(
      signup.email,
      `Payment confirmation: ${event.title}`,
      expect.stringContaining("has been received"),
    );
  });

  test("handles checkout.session.expired event", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Send webhook event for checkout.session.expired
    const mockEvent = {
      type: "checkout.session.expired",
      data: { object: { id: payment!.stripeCheckoutSessionId } },
    } as Stripe.Event;

    const response = await api.stripeWebhook(JSON.stringify(mockEvent), "t=12345,v1=fakesignature");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });

    // Verify payment was marked as EXPIRED
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.EXPIRED);

    // Verify no email was sent
    expect(emailSend).not.toHaveBeenCalled();
  });

  test.todo("rejects webhook with missing signature", async () => {
    // This is the responsibility of the Stripe SDK and not really easy to test nicely.
  });

  test("rejects webhook with invalid signature", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Mock Stripe webhook signature verification to throw
    mockStripeWebhookConstructEvent.mockImplementationOnce(() => {
      throw new Stripe.errors.StripeSignatureVerificationError({ type: "api_error" });
    });

    // Send webhook event
    const mockEvent = {
      type: "checkout.session.completed",
      data: { object: { id: payment!.stripeCheckoutSessionId } },
    } as Stripe.Event;

    const response = await api.stripeWebhook(JSON.stringify(mockEvent), "t=12345,v1=invalidsignature");
    expect(response.statusCode).toBe(400);

    // Verify payment status unchanged
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PENDING);

    // Verify no email was sent
    expect(emailSend).not.toHaveBeenCalled();
  });

  test("handles duplicate webhooks idempotently", async () => {
    const { event, signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Send webhook event for checkout.session.completed a few times
    const mockEvent = {
      type: "checkout.session.completed",
      data: { object: { id: payment!.stripeCheckoutSessionId } },
    } as Stripe.Event;

    const confirmationTimes = [new Date()];
    for (let i = 0; i < 4; i++) {
      // eslint-disable-next-line no-await-in-loop
      const response = await api.stripeWebhook(JSON.stringify(mockEvent), "t=12345,v1=fakesignature");
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ received: true });
      confirmationTimes.push(new Date());
    }

    // Verify payment was marked as PAID during first webhook only
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PAID);
    expect(payment!.completedAt).toBeTruthy();
    expect(payment!.completedAt!.getTime()).toBeGreaterThanOrEqual(confirmationTimes[0].getTime());
    expect(payment!.completedAt!.getTime()).toBeLessThanOrEqual(confirmationTimes[1].getTime());

    // Verify only one email was sent
    expect(emailSend).toHaveBeenCalledExactlyOnceWith(
      signup.email,
      `Payment confirmation: ${event.title}`,
      expect.stringContaining("has been received"),
    );
  });

  test("ignores webhook when payment already paid", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    await api.startPayment(signup.id);
    const payment = await Payment.findOne({ where: { signupId: signup.id } });

    // Mark payment as PAID via webhook simulation
    await checkoutSessionStatusUpdated(payment!.stripeCheckoutSessionId!, "complete");
    expect(emailSend).toHaveBeenCalledOnce();

    // Send webhook event for checkout.session.completed again
    const mockEvent = {
      type: "checkout.session.completed",
      data: { object: { id: payment!.stripeCheckoutSessionId } },
    } as Stripe.Event;

    const response = await api.stripeWebhook(JSON.stringify(mockEvent), "t=12345,v1=fakesignature");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });

    // Verify payment is still PAID
    await payment!.reload();
    expect(payment!.status).toBe(PaymentStatus.PAID);

    // Verify only one email was sent (earlier)
    expect(emailSend).toHaveBeenCalledOnce();
  });
});

describe("database constraints and triggers", () => {
  test.todo("enforces unique active payment constraint", async () => {
    // TODO: Test that creating two PENDING payments for the same signup fails
    // with unique constraint violation
  });

  test.todo("enforces session ID consistency constraint", async () => {
    // TODO: Test that PENDING/PAID/EXPIRED/REFUNDED payments require stripeCheckoutSessionId
    // and CREATING/CREATION_FAILED payments must have NULL session ID
  });

  test.todo("enforces valid state transitions", async () => {
    // TODO: Test that invalid state transitions (e.g., EXPIRED -> PENDING) are rejected
  });

  test.todo("enforces valid terminal state transitions", async () => {
    // TODO: Test that terminal states (EXPIRED, CREATION_FAILED, REFUNDED) cannot transition
  });

  test.todo("prevents updates to immutable fields", async () => {
    // TODO: Test that updating amount, currency, products, expiresAt, etc. is rejected
  });

  test.todo("prevents changing stripeCheckoutSessionId once set", async () => {
    // TODO: Test that updating stripeCheckoutSessionId from non-null to different value fails
  });

  test.todo("prevents DELETE operations", async () => {
    // TODO: Test that DELETE operations on Payment table are blocked by trigger
  });
});

describe("expirePaymentForSignupUpdate", () => {
  test("handles PENDING payment", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a PENDING payment
    const session = await getStripe().checkout.sessions.create();
    const payment = await createMockPayment(signup, PaymentStatus.PENDING, session);

    // Call the utility function
    await expirePaymentForSignupUpdate(payment);

    // Verify Stripe was called and payment was updated
    expect(mockStripeCheckoutSessionExpire).toHaveBeenCalledWith(session.id);
    await payment.reload();
    expect(payment.status).toBe(PaymentStatus.EXPIRED);
  });

  test("handles CREATING payment", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a CREATING payment
    const payment = await createMockPayment(signup, PaymentStatus.CREATING);

    // Call the utility function
    await expirePaymentForSignupUpdate(payment);

    // Verify payment was marked as CREATION_FAILED
    await payment.reload();
    expect(payment.status).toBe(PaymentStatus.CREATION_FAILED);
  });

  test("does nothing for PAID payment", async () => {
    const { signup } = await defaultTestEventAndSignup();

    // Create a PAID payment
    const session = await getStripe().checkout.sessions.create();
    const payment = await createMockPayment(signup, PaymentStatus.PAID, session);

    // Call the utility function - should not throw
    await expirePaymentForSignupUpdate(payment);

    // Verify status unchanged
    await payment.reload();
    expect(payment.status).toBe(PaymentStatus.PAID);
  });
});

describe("checkoutSessionStatusUpdated", () => {
  test.todo("transitions PENDING to PAID on complete status", async () => {
    // TODO: Test that checkoutSessionStatusUpdated with "complete" status
    // updates payment to PAID and sets completedAt
  });

  test.todo("transitions PENDING to EXPIRED on expired status", async () => {
    // TODO: Test that checkoutSessionStatusUpdated with "expired" status
    // updates payment to EXPIRED
  });

  test.todo("does nothing for open status", async () => {
    // TODO: Test that checkoutSessionStatusUpdated with "open" status
    // leaves payment unchanged
  });

  test.todo("is idempotent when payment already transitioned", async () => {
    // TODO: Test that calling checkoutSessionStatusUpdated multiple times
    // for the same session only performs side effects once (0 rows updated on subsequent calls)
  });
});

describe("pollPendingPayments", () => {
  test.todo("polls stale PENDING payments", async () => {
    // TODO: Test background job that finds PENDING payments past expiresAt,
    // queries Stripe, and updates status accordingly
  });
});

describe("cleanupStaleCreatingPayments", () => {
  test.todo("cleans up stale CREATING payments", async () => {
    // TODO: Test background job that marks old CREATING payments as CREATION_FAILED
  });
});
