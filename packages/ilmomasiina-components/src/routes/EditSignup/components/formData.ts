import type { QuestionID, SignupForEdit, SignupUpdateBody } from "@tietokilta/ilmomasiina-models";

// react-final-form works better when we convert answers to an object
export type SignupFormData<S extends SignupUpdateBody = SignupUpdateBody> = Omit<S, "answers"> & {
  answers: Record<QuestionID, string | string[]>;
};

/** Converts answers to object form for react-final-form. */
export const signupToFormData = <S extends Pick<SignupForEdit, "answers">>(signup: S): SignupFormData<S> => ({
  ...signup,
  answers: Object.fromEntries(signup.answers.map(({ questionId, answer }) => [questionId, answer])),
});

/** Convert answers back from object to array. */
export const formDataToSignupUpdate = <S extends SignupUpdateBody>(formData: SignupFormData<S>) => ({
  ...formData,
  answers: Object.entries(formData.answers).map(([questionId, answer]) => ({
    questionId,
    answer,
  })),
});
