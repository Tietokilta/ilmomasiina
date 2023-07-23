import React from 'react';

import { useFormikContext } from 'formik';
import { Form } from 'react-bootstrap';

import { FieldRow } from '@tietokilta/ilmomasiina-components';
import { EditorEvent } from '../../../modules/editor/types';
import DateTimePicker from './DateTimePicker';
import Quotas from './Quotas';

const QuotasTab = () => {
  const { values: { useOpenQuota } } = useFormikContext<EditorEvent>();
  return (
    <div>
      <FieldRow
        name="registrationStartDate"
        as={DateTimePicker}
        label="Registration begins"
        required
      />
      <FieldRow
        name="registrationEndDate"
        as={DateTimePicker}
        label="Registration ends"
        required
      />
      <FieldRow
        name="signupsPublic"
        label="Publicity"
        as={Form.Check}
        type="checkbox"
        checkAlign
        checkLabel="Registrations are public"
      />
      <hr />
      <Quotas />
      <FieldRow
        name="useOpenQuota"
        label="Open quota"
        as={Form.Check}
        type="checkbox"
        checkAlign
        checkLabel="In addition, use a common quota"
        help={
          'The first applicants who do not fit into the quota of their choice' +
          ' will automatically be placed in the open quota in the order in which they enrol.'
        }
      />
      {useOpenQuota && (
        <FieldRow
          name="openQuotaSize"
          label="The size of the open quota"
          type="number"
          min="0"
          required
        />
      )}
    </div>
  );
};

export default QuotasTab;
