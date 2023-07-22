import React, { useCallback } from 'react';

import { useFormikContext } from 'formik';
import { toast } from 'react-toastify';

import ConfirmButton from '../../../components/ConfirmButton';
import { useNavigate } from '../../../config/router';
import { usePaths } from '../../../contexts';
import { useDeleteSignup, useEditSignupContext } from '../../../modules/editSignup';

const DELETE_CONFIRM_MS = 4000;

const DeleteSignup = () => {
  const { event } = useEditSignupContext();
  const deleteSignup = useDeleteSignup();
  const navigate = useNavigate();
  const paths = usePaths();

  const { isSubmitting, setSubmitting } = useFormikContext();

  const doDelete = useCallback(async () => {
    const progressToast = toast.loading('Registration will be removed');
    try {
      setSubmitting(true);
      await deleteSignup();
      toast.update(progressToast, {
        render: 'Your registration was successfully removed.',
        type: toast.TYPE.SUCCESS,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
      navigate(paths.eventDetails(event!.slug));
    } catch (error) {
      setSubmitting(false);
      toast.update(progressToast, {
        render: 'The removal failed.',
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
    }
  }, [deleteSignup, event, navigate, paths, setSubmitting]);

  return (
    <div className="ilmo--delete-container">
      <h2>Remove your registration</h2>
      <p>
        Are you sure you want to delete your registration for the event
        {' '}
        <strong>
          {event!.title}
        </strong>
        ?
      </p>
      <p>
        If you delete your registration, you will lose your place in the queue. If 
        you change your mind, you can always sign up for the event again 
        later, but then you will be added to the end of the queue.
        {' '}
        <strong>This activity cannot be reversed.</strong>
      </p>
      <ConfirmButton
        type="button"
        disabled={isSubmitting}
        onClick={doDelete}
        variant="danger"
        confirmDelay={DELETE_CONFIRM_MS}
        confirmLabel="Press again to confirm&hellip;"
      >
        Remove your registration
      </ConfirmButton>
    </div>
  );
};

export default DeleteSignup;
