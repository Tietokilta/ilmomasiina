import { testEvent, testSignups } from "test/testData";
import { describe, expect, test } from "vitest";

import { EDIT_TOKEN_HEADER, SignupForEditResponse } from "@tietokilta/ilmomasiina-models";
import { Signup } from "../../src/models/signup";
import { refreshSignupPositionsAndGet } from "../../src/routes/signups/computeSignupPosition";
import { generateToken } from "../../src/routes/signups/editTokens";

async function fetchSignupForEdit(signup: Signup, editToken?: string | false) {
  const headers: Record<string, string> = {};
  if (editToken !== false) {
    headers[EDIT_TOKEN_HEADER] = editToken ?? generateToken(signup.id);
  }
  const response = await server.inject({
    method: "GET",
    url: `/api/signups/${signup.id}`,
    headers,
  });
  return [response.json<SignupForEditResponse>(), response] as const;
}

describe("getSignupForEdit", () => {
  test("returns signup for editing", async () => {
    const event = await testEvent();
    const [signup] = await testSignups(event, { count: 1, confirmed: true });
    const quota = await signup.getQuota();
    const answers = await signup.getAnswers();

    const [data, response] = await fetchSignupForEdit(signup);

    expect(response.statusCode).toBe(200);

    expect(data).toEqual({
      event: expect.any(Object),
      signup: {
        id: signup.id,
        firstName: signup.firstName,
        lastName: signup.lastName,
        email: signup.email,
        namePublic: signup.namePublic,
        answers: expect.arrayContaining(answers.map(({ questionId, answer }) => ({ questionId, answer }))),
        confirmed: true,
        createdAt: signup.createdAt.toISOString(),
        quota: {
          id: quota.id,
          title: quota.title,
          size: quota.size,
        },
        position: null,
        status: null,
        confirmableForMillis: 0,
        editableForMillis: expect.any(Number),
      },
    });
  });

  test("returns nulls for unconfirmed signup", async () => {
    const event = await testEvent();
    const [signup] = await testSignups(event, { count: 1, confirmed: false });

    const [data] = await fetchSignupForEdit(signup);

    expect(data).toMatchObject({
      signup: {
        firstName: null,
        lastName: null,
        email: null,
        answers: [],
      },
    });
  });

  test("returns correct status information", async () => {
    const event = await testEvent();
    const signups = await testSignups(event, { count: 40 });
    const signup = signups[0]; // created in random order, so this suffices
    const status = await refreshSignupPositionsAndGet(event, signup.id);

    const [data] = await fetchSignupForEdit(signup);

    expect(data.signup.status).toEqual(status.status);
    expect(data.signup.position).toEqual(status.position);
  });

  test("checks edit token authentication", async () => {
    const event = await testEvent();
    const [signup, other] = await testSignups(event, {
      count: 2,
      confirmed: true,
    });

    let [data, response] = await fetchSignupForEdit(signup, false);
    expect(response.statusCode).toBe(403);
    expect(data.signup).toBe(undefined);

    [data, response] = await fetchSignupForEdit(signup, generateToken(other.id));
    expect(response.statusCode).toBe(403);
    expect(data.signup).toBe(undefined);
  });
});
