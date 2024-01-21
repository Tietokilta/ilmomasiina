import React from 'react';

import { Button, ButtonGroup } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { ApiError } from '@tietokilta/ilmomasiina-components';
import { errorDesc } from '@tietokilta/ilmomasiina-components/dist/utils/errorMessage';
import type { UserSchema } from '@tietokilta/ilmomasiina-models';
import { deleteUser, getUsers, resetUserPassword } from '../../modules/adminUsers/actions';
import { useTypedDispatch } from '../../store/reducers';

type Props = {
  user: UserSchema;
};

const AdminUserListItem = ({ user }: Props) => {
  const dispatch = useTypedDispatch();
  const { t } = useTranslation();

  async function onDelete() {
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(t('adminUsers.deleteUser.confirm', { user: user.email }));
    if (confirmed) {
      try {
        await dispatch(deleteUser(user.id));
        toast.success(t('adminUsers.deleteUser.success', { user: user.email }), { autoClose: 5000 });
      } catch (err) {
        toast.error(
          errorDesc(t, err as ApiError, 'adminUsers.deleteUser.errors', { user: user.email }),
          { autoClose: 5000 },
        );
      }
      dispatch(getUsers());
    }
  }
  async function onResetPassword() {
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(t('adminUsers.resetPassword.confirm', { user: user.email }));
    if (confirmed) {
      try {
        await dispatch(resetUserPassword(user.id));
        toast.success(t('adminUsers.resetPassword.success', { user: user.email }), { autoClose: 5000 });
      } catch (err) {
        toast.error(
          errorDesc(t, err as ApiError, 'adminUsers.resetPassword.errors', { user: user.email }),
          { autoClose: 5000 },
        );
      }
    }
  }
  return (
    <tr>
      <td>{user.email}</td>
      <td>
        <ButtonGroup size="sm">
          <Button type="button" onClick={onResetPassword} size="sm" variant="secondary">
            {t('adminUsers.resetPassword')}
          </Button>
          <Button type="button" onClick={onDelete} size="sm" variant="danger">
            {t('adminUsers.deleteUser')}
          </Button>
        </ButtonGroup>
      </td>
    </tr>
  );
};

export default AdminUserListItem;
