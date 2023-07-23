import React from 'react';

import { useEditSignupContext } from '../../../modules/editSignup';

const SignupStatus = () => {
  const { event, signup } = useEditSignupContext();
  const { status, position, quota } = signup!;
  const { openQuotaSize } = event!;

  if (!status) return null;

  if (status === 'in-quota') {
    return (
      <p>
        {`You are in the quota ${quota.title}, ranked ${position}${quota.size ? ` / ${quota.size}` : ''}.`}
      </p>
    );
  }

  if (status === 'in-open') {
    return (
      <p>
        {`You are ranked ${position} / ${openQuotaSize} the open quota.`}
      </p>
    );
  }

  return (
    <p>
      {`Your position in the queue: ${position}.`}
    </p>
  );
};

export default SignupStatus;
