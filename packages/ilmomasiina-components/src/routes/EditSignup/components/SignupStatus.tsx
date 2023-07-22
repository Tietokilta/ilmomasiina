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
        {`You are in the quota ${quota.title} in place ${position}${quota.size ? ` / ${quota.size}` : ''}.`}
      </p>
    );
  }

  if (status === 'in-open') {
    return (
      <p>
        {`You are ranked in an open quota ${position} / ${openQuotaSize}.`}
      </p>
    );
  }

  return (
    <p>
      {`You are in the queue in place ${position}.`}
    </p>
  );
};

export default SignupStatus;
