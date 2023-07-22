import React, { useState } from 'react';

import { Formik, FormikHelpers } from 'formik';
import { Button, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';

import type { SignupUpdateBody } from '@tietokilta/ilmomasiina-models';
import FieldRow from '../../../components/FieldRow';
import { linkComponent, useNavigate } from '../../../config/router';
import { usePaths } from '../../../contexts/paths';
import { useEditSignupContext, useUpdateSignup } from '../../../modules/editSignup';
import DeleteSignup from './DeleteSignup';
import NarrowContainer from './NarrowContainer';
import QuestionFields from './QuestionFields';
import SignupStatus from './SignupStatus';

const EditForm = () => {
  const { event, signup, registrationClosed } = useEditSignupContext();
  const isNew = !signup!.confirmed;
  const updateSignup = useUpdateSignup();
  const Link = linkComponent();
  const navigate = useNavigate();
  const paths = usePaths();

  // TODO: actually use errors from API
  const [submitError, setSubmitError] = useState(false);

  async function onSubmit(answers: SignupUpdateBody, { setSubmitting }: FormikHelpers<SignupUpdateBody>) {
    const action = isNew ? 'Registration' : 'Adaptation';
    const progressToast = toast.loading(`${action} in progress`);

    try {
      await updateSignup(answers);

      toast.update(progressToast, {
        render: `${action} succeeded!`,
        type: toast.TYPE.SUCCESS,
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
      setSubmitError(false);
      setSubmitting(false);
      if (isNew) {
        navigate(paths.eventDetails(event!.slug));
      }
    } catch (error) {
      toast.update(progressToast, {
        render: `${action} did not work. Check that all mandatory fields are filled and try again.`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
      setSubmitError(true);
      setSubmitting(false);
    }
  }

  return (
    <Formik
      initialValues={signup! as SignupUpdateBody}
      onSubmit={onSubmit}
    >
      {({ handleSubmit, isSubmitting }) => (
        <NarrowContainer>
          <h2>{isNew ? 'Sign up' : 'Edit sign-up'}</h2>
          <SignupStatus />
          {submitError && (
            <p className="ilmo--form-error">There are errors in your sign-up.</p>
          )}
          {registrationClosed && (
            <p className="ilmo--form-error">
              Your registration can no longer be edited or canceled because the event 
              registration has closed.
            </p>
          )}
          <Form onSubmit={handleSubmit} className="ilmo--form">
            {event!.nameQuestion && (
              <>
                <FieldRow
                  name="firstName"
                  label="First name"
                  placeholder="First name"
                  required
                  readOnly={!isNew || registrationClosed}
                />
                <FieldRow
                  name="lastName"
                  label="Last name"
                  placeholder="Last name"
                  required
                  readOnly={!isNew || registrationClosed}
                />
                <FieldRow
                  name="namePublic"
                  as={Form.Check}
                  type="checkbox"
                  disabled={registrationClosed}
                  checkAlign
                  checkLabel={(
                    <>
                      Show name in public participant list
                    </>
                  )}
                />
              </>
            )}
            {event!.emailQuestion && (
              <FieldRow
                name="email"
                label="E-mail"
                placeholder="E-mail"
                required
                readOnly={!isNew || registrationClosed}
              />
            )}

            <QuestionFields name="answers" questions={event!.questions} disabled={registrationClosed} />

            {!registrationClosed && (
              <p>
                You can edit your registration or delete it later by saving the URL of this page.
                {event!.emailQuestion && ' The link will also be sent to your email in confirmation message.'}
              </p>
            )}

            {!registrationClosed && (
              <nav className="ilmo--submit-buttons">
                {!isNew && (
                  <Button as={Link} variant="link" to={paths.eventDetails(event!.slug)}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" variant="primary" formNoValidate disabled={isSubmitting}>
                  {isNew ? 'Send' : 'Update'}
                </Button>
              </nav>
            )}
          </Form>
          {!registrationClosed && <DeleteSignup />}
        </NarrowContainer>
      )}
    </Formik>
  );
};

export default EditForm;
