import React from 'react';

import { Field, Formik, FormikHelpers } from 'formik';
import {
  Alert, Button, Form, Spinner,
} from 'react-bootstrap';
import { toast } from 'react-toastify';

import { changePassword } from '../../modules/adminUsers/actions';
import { useTypedDispatch } from '../../store/reducers';

type FormData = {
  oldPassword: string;
  newPassword: string;
  newPasswordVerify: string;
};

function validate(values: FormData) {
  const errors: Partial<FormData> = {};
  if (!values.oldPassword) {
    errors.oldPassword = 'Required field';
  }
  if (!values.newPassword) {
    errors.newPassword = 'Required field';
  } else if (values.newPassword.length < 10) {
    errors.newPassword = 'Password must contain at least 10 characters';
  }
  if (!values.newPasswordVerify) {
    errors.newPasswordVerify = 'Required field';
  } else if (values.newPassword && values.newPassword !== values.newPasswordVerify) {
    errors.newPasswordVerify = 'The passwords do not match';
  }
  return errors;
}

const ChangePasswordForm = () => {
  const dispatch = useTypedDispatch();

  const onSubmit = async (data: FormData, { setSubmitting, resetForm }: FormikHelpers<FormData>) => {
    // TODO: better error handling
    const success = await dispatch(changePassword(data));
    if (success) {
      resetForm();
      toast.success('The password was successfully changed.', { autoClose: 5000 });
    } else {
      toast.error('Failed to change your password.', { autoClose: 5000 });
    }
    setSubmitting(false);
  };

  return (
    <Formik
      initialValues={{
        oldPassword: '',
        newPassword: '',
        newPasswordVerify: '',
      }}
      onSubmit={onSubmit}
      validate={validate}
    >
      {({
        errors, touched, isSubmitting, handleSubmit,
      }) => (

        <Form
          className="ilmo--form"
          onSubmit={handleSubmit}
        >
          <Field
            as={Form.Control}
            name="oldPassword"
            id="oldPassword"
            type="password"
            placeholder="Old password"
            aria-label="Vanha salasana"
          />
          {errors.oldPassword && touched.oldPassword ? (
            <Alert variant="danger">{errors.oldPassword}</Alert>
          ) : null}
          <Field
            as={Form.Control}
            name="newPassword"
            id="newPassword"
            type="password"
            placeholder="New password"
            aria-label="Uusi salasana"
          />
          {errors.newPassword && touched.newPassword ? (
            <Alert variant="danger">{errors.newPassword}</Alert>
          ) : null}
          <Field
            as={Form.Control}
            name="newPasswordverify"
            id="newPasswordverify"
            type="password"
            placeholder="New password"
            aria-label="Uusi salasana"
          />
          {errors.newPasswordVerify && touched.newPasswordVerify ? (
            <Alert variant="danger">{errors.newPasswordVerify}</Alert>
          ) : null}
          <Button type="submit" variant="secondary" disabled={isSubmitting}>
            {isSubmitting ? <Spinner animation="border" /> : 'Change Password'}
          </Button>
        </Form>
      )}
    </Formik>
  );
};

export default ChangePasswordForm;
