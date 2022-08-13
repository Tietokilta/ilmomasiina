import React from 'react';

import { Button, Container, Navbar } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import { paths } from '@tietokilta/ilmomasiina-components/src/config/paths';
import branding from '../../branding';
import { logout } from '../../modules/auth/actions';
import { useTypedDispatch, useTypedSelector } from '../../store/reducers';

import './Header.scss';

const Header = () => {
  const dispatch = useTypedDispatch();
  const loggedIn = useTypedSelector((state) => state.auth.loggedIn);

  return (
    <Navbar>
      <Container>
        <Link to={paths().eventsList} className="navbar-brand">
          {branding.headerTitle}
        </Link>
        {loggedIn && (
          <Button
            onClick={() => dispatch(logout())}
          >
            Logout
          </Button>
        )}
      </Container>
    </Navbar>
  );
};

export default Header;
