import React, { useContext } from 'react';

import moment from 'moment-timezone';
import { Button } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { timezone } from '../../../config';
import { linkComponent } from '../../../config/router';
import AuthContext from '../../../contexts/auth';
import { usePaths } from '../../../contexts/paths';
import { useSingleEventContext } from '../../../modules/singleEvent';

const EventDescription = () => {
  const event = useSingleEventContext().event!;
  const { loggedIn } = useContext(AuthContext);
  const Link = linkComponent();
  const paths = usePaths();
  return (
    <>
      <nav className="ilmo--title-nav">
        <h1>{event.title}</h1>
        {loggedIn && paths.hasAdmin && (
          <Button as={Link} variant="primary" to={paths.adminEditEvent(event.id)}>
            Edit
          </Button>
        )}
      </nav>
      <div className="ilmo--event-heading">
        {event.category && (
          <p>
            <strong>Category:</strong>
            {' '}
            {event.category}
          </p>
        )}
        {event.date && (
          <p>
            <strong>{event.endDate ? 'Start:' : 'Date:'}</strong>
            {' '}
            {moment(event.date).tz(timezone()).format('D.M.Y [at] HH:mm')}
          </p>
        )}
        {event.endDate && (
          <p>
            <strong>End:</strong>
            {' '}
            {moment(event.endDate).tz(timezone()).format('D.M.Y [at] HH:mm')}
          </p>
        )}
        {event.location && (
          <p>
            <strong>Location:</strong>
            {' '}
            {event.location}
          </p>
        )}
        {event.price && (
          <p>
            <strong>Price:</strong>
            {' '}
            {event.price}
          </p>
        )}
        {event.webpageUrl && (
          <p>
            <strong>Homepage:</strong>
            {' '}
            <a href={event.webpageUrl} title="Homepage">
              {event.webpageUrl}
            </a>
          </p>
        )}
        {event.facebookUrl && (
          <p>
            <strong>Facebook event:</strong>
            {' '}
            <a href={event.facebookUrl} title="Facebook event">
              {event.facebookUrl}
            </a>
          </p>
        )}
      </div>
      <div className="ilmo--event-description">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {event.description || ''}
        </ReactMarkdown>
      </div>
    </>
  );
};

export default EventDescription;
