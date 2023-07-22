import React, { useEffect } from 'react';

import { Button, Spinner } from 'react-bootstrap';
import { shallowEqual } from 'react-redux';
import { Link } from 'react-router-dom';

import requireAuth from '../../containers/requireAuth';
import { getAdminEvents, resetState } from '../../modules/adminEvents/actions';
import appPaths from '../../paths';
import { useTypedDispatch, useTypedSelector } from '../../store/reducers';
import AdminEventListItem from './AdminEventListItem';

const AdminEventsList = () => {
  const dispatch = useTypedDispatch();
  const { events, eventsLoadError } = useTypedSelector((state) => state.adminEvents, shallowEqual);

  useEffect(() => {
    dispatch(getAdminEvents());
    return () => {
      dispatch(resetState());
    };
  }, [dispatch]);

  if (eventsLoadError) {
    return (
      <>
        <h1>Oops, something went wrong</h1>
        <p>Failed to load events</p>
      </>
    );
  }

  if (!events) {
    return (
      <>
        <h1>Controls</h1>
        <Spinner animation="border" />
      </>
    );
  }

  return (
    <>
      <nav className="ilmo--title-nav">
        <h1>Controls</h1>
        <Button as={Link} variant="secondary" to={appPaths.adminUsersList}>
          Users
        </Button>
        <Button as={Link} variant="secondary" to={appPaths.adminAuditLog}>
          Activity log
        </Button>
        <Button as={Link} variant="primary" to={appPaths.adminEditEvent('new')}>
          + New event
        </Button>
      </nav>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Time</th>
            <th>Status</th>
            <th>Sign-ups</th>
            <th>Activities</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <AdminEventListItem
              key={event.id}
              event={event}
            />
          ))}
        </tbody>
      </table>
    </>
  );
};

export default requireAuth(AdminEventsList);
