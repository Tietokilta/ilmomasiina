import React, { useEffect } from 'react';

import { Spinner } from 'react-bootstrap';
import { shallowEqual } from 'react-redux';
import { Link } from 'react-router-dom';

import requireAuth from '../../containers/requireAuth';
import { getUsers, resetState } from '../../modules/adminUsers/actions';
import appPaths from '../../paths';
import { useTypedDispatch, useTypedSelector } from '../../store/reducers';
import AdminUserListItem from './AdminUserListItem';
import ChangePasswordForm from './ChangePasswordForm';
import UserForm from './UserForm';

// import './AdminUsersList.scss';

const AdminUsersList = () => {
  const dispatch = useTypedDispatch();
  const { users, usersLoadError } = useTypedSelector((state) => state.adminUsers, shallowEqual);

  useEffect(() => {
    dispatch(getUsers());
    return () => {
      resetState();
    };
  }, [dispatch]);

  if (usersLoadError) {
    return (
      <>
        <h1>Oops, something went wrong</h1>
        <p>Users' download failed</p>
      </>
    );
  }

  let content = <Spinner animation="border" />;

  if (users) {
    content = (
      <>
        <table className="table">
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <AdminUserListItem
                key={user.id}
                user={user}
              />
            ))}
          </tbody>
        </table>

        <h1>Create a new user</h1>
        <UserForm />
        <h1>Change your password</h1>
        <ChangePasswordForm />
      </>
    );
  }

  return (
    <>
      <Link to={appPaths.adminEventsList}>&#8592; Back</Link>
      <h1>User control</h1>
      {content}
    </>
  );
};

export default requireAuth(AdminUsersList);
