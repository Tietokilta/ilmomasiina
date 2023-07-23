import React from 'react';

import { useFormikContext } from 'formik';
import { Form } from 'react-bootstrap';

import { FieldRow } from '@tietokilta/ilmomasiina-components';
import { EditorEvent } from '../../../modules/editor/types';
import Questions from './Questions';

const QuestionsTab = () => {
  const { values: { nameQuestion, emailQuestion } } = useFormikContext<EditorEvent>();
  return (
    <div>
      <FieldRow
        name="nameQuestion"
        label="Name"
        as={Form.Check}
        type="checkbox"
        checkAlign
        checkLabel="Collect the names"
        help={
          nameQuestion
            ? 'The name is a mandatory question. The participant may decide whether the name is publicly visible.'
            : 'If the name is asked, the participant may decide whether the name is publicly visible.'
        }
      />
      <FieldRow
        name="emailQuestion"
        label="Email"
        as={Form.Check}
        type="checkbox"
        checkAlign
        checkLabel="Collect email addresses"
        help={
          emailQuestion
            ? 'Email address is a required question. Participants will be sent a confirmation' +
            ' e-mail and an e-mail notification about getting a place from the queue.'
            : 'If the email address is not asked, participants will not receive confirmation' +
            ' email or email notification about getting a place from the queue.'
        }
      />
      <Questions />
    </div>
  );
};

export default QuestionsTab;
