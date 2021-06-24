/** @jsx jsx */
import { useEffect } from 'react';

import { shallowEqual } from 'react-redux';
import { Link } from 'react-router-dom';
import { Button, jsx, Spinner } from 'theme-ui';

import { getAdminEvents, resetState } from '../../modules/admin/actions';
import { useTypedDispatch, useTypedSelector } from '../../store/reducers';
import AdminEventListItem from './AdminEventListItem';
import UserForm from './UserForm';

import './AdminEventsList.scss';

const AdminEventList = () => {
  const dispatch = useTypedDispatch();
  const { events, eventsLoadError } = useTypedSelector((state) => state.admin, shallowEqual);

  useEffect(() => {
    dispatch(getAdminEvents());
    return () => {
      resetState();
    };
  }, []);

  if (eventsLoadError) {
    return (
      <div className="container">
        <h1>Hups, jotain meni pieleen</h1>
        <p>Tapahtumien lataus epäonnistui</p>
      </div>
    );
  }

  if (!events) {
    return (
      <div className="container">
        <h1>Hallinta</h1>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Hallinta</h1>
      <table className="table">
        <thead>
          <tr>
            <th>Nimi</th>
            <th>Ajankohta</th>
            <th>Tila</th>
            <th>Ilmoittautuneita</th>
            <th>Toiminnot</th>
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
      <Button variant="secondary">
        <Link
          to={`${PREFIX_URL}/admin/edit/new`}
          sx={{
            color: 'inherit',
          }}
        >
          + Uusi tapahtuma
        </Link>
      </Button>

      <h1>Luo uusi käyttäjä</h1>
      <UserForm />
    </div>
  );
};

export default AdminEventList;
