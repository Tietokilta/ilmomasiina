import React from 'react';

import { Spinner } from 'react-bootstrap';

import { useParams } from '../../config/router';
import { EditSignupProps, EditSignupProvider, useEditSignupContext } from '../../modules/editSignup';
import EditForm from './components/EditForm';
import NarrowContainer from './components/NarrowContainer';

const EditSignupView = () => {
  const { error, pending } = useEditSignupContext();

  if (error) {
    return (
      <NarrowContainer className="ilmo--status-container">
        <h1>Oops, something went wrong</h1>
        <p>
          Your registration was not found. It may have already been deleted, or something else strange happened.
          If your registration has not yet been deleted, please try again soon.
        </p>
      </NarrowContainer>
    );
  }

  if (pending) {
    return (
      <div className="ilmo--loading-container">
        <Spinner animation="border" />
      </div>
    );
  }

  return <EditForm />;
};

const EditSignup = () => {
  const { id, editToken } = useParams<EditSignupProps>();
  return (
    <EditSignupProvider id={id} editToken={editToken}>
      <EditSignupView />
    </EditSignupProvider>
  );
};

export default EditSignup;
