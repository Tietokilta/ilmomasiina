import React from 'react';

import { Link } from 'react-router-dom';

import appPaths from '../../paths';

const PageNotFound = () => (
  <div className="ilmo--status-container">
    <h1>404</h1>
    <p>
      Page not found.
    </p>
    <p>
      <Link to={appPaths.eventsList}>Return to the event list</Link>
    </p>
  </div>
);

export default PageNotFound;
