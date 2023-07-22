import React from 'react';

import { FieldRow } from '@tietokilta/ilmomasiina-components';
import Textarea from './Textarea';

const EmailsTab = () => (
  <FieldRow
    name="verificationEmail"
    as={Textarea}
    label="Verification Email"
    rows={10}
  />
);

export default EmailsTab;
