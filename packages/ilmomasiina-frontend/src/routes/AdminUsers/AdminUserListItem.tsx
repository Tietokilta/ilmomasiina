import React from 'react';

import { Button, ButtonGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';

import type { UserSchema } from '@tietokilta/ilmomasiina-models';
import { deleteUser, getUsers, resetUserPassword } from '../../modules/adminUsers/actions';
import { useTypedDispatch } from '../../store/reducers';

type Props = {
  user: UserSchema;
};

const AdminUserListItem = ({ user }: Props) => {
  const dispatch = useTypedDispatch();

  async function onDelete() {
    const confirmed = window.confirm(
      'Want to delete this user? This activity cannot be undone.',
    );
    if (confirmed) {
      const success = await dispatch(deleteUser(user.id));
      if (!success) {
        toast.error('The removal failed :(', { autoClose: 5000 });
      }
      dispatch(getUsers());
    }
  }
  async function onResetPassword() {
    const confirmed = window.confirm(
      'Want to reset the user\'s password? The new password will be sent to the user\'s email.',
    );
    if (confirmed) {
      const success = await dispatch(resetUserPassword(user.id));
      if (!success) {
        toast.error('Failed to reset your password :(', { autoClose: 5000 });
      } else {
        toast.success('The password was reset successfully.', { autoClose: 5000 });
      }
    }
  }
  return (
    <tr>
      <td>{user.email}</td>
      <td>
        <ButtonGroup size="sm">
          <Button type="button" onClick={onResetPassword} size="sm" variant="secondary">Reset the password</Button>
          <Button type="button" onClick={onDelete} size="sm" variant="danger">Remove the user</Button>
        </ButtonGroup>
      </td>
    </tr>
  );
};

export default AdminUserListItem;
