import React, { useMemo } from 'react';

import { Button } from 'react-bootstrap';
import { CSVLink } from 'react-csv';

import { convertSignupsToCSV, getSignupsForAdminList } from '@tietokilta/ilmomasiina-components/dist/utils/signupUtils';
import { deleteSignup, getEvent } from '../../../modules/editor/actions';
import { useTypedDispatch, useTypedSelector } from '../../../store/reducers';

import '../Editor.scss';

const SignupsTab = () => {
  const dispatch = useTypedDispatch();
  const event = useTypedSelector((state) => state.editor.event);

  const signups = useMemo(() => event && getSignupsForAdminList(event), [event]);

  const csvSignups = useMemo(() => event && convertSignupsToCSV(event, signups!), [event, signups]);

  if (!event || !signups?.length) {
    return (
      <p>There are no sign-ups for the event yet. When there are sign-ups for the event, you will see them here.</p>
    );
  }

  return (
    <div>
      <CSVLink
        data={csvSignups!}
        separator={'\t'}
        filename={`${event.title} osallistujalista.csv`}
      >
        Download the participant list
      </CSVLink>
      <br />
      <br />
      <table className="event-editor--signup-table table table-condensed table-responsive">
        <thead>
          <tr className="active">
            <th key="position">#</th>
            {event.nameQuestion && <th key="firstName">First name</th>}
            {event.nameQuestion && <th key="lastName">Last name</th>}
            {event.emailQuestion && <th key="email">Email</th>}
            <th key="quota">Quota</th>
            {event.questions.map((q) => (
              <th key={q.id}>{q.question}</th>
            ))}
            <th key="timestamp">Registration time</th>
            <th key="delete" aria-label="Poista" />
          </tr>
        </thead>
        <tbody>
          {signups.map((signup, index) => (
            <tr key={signup.id} className={!signup.confirmed ? 'text-muted' : ''}>
              <td key="position">{`${index + 1}.`}</td>
              {event.nameQuestion && <td key="firstName">{signup.firstName}</td>}
              {event.nameQuestion && <td key="lastName">{signup.lastName}</td>}
              {event.emailQuestion && <td key="email">{signup.email}</td>}
              <td key="quota">{signup.quota}</td>
              {event.questions.map((question) => (
                <td key={question.id}>{signup.answers[question.id]}</td>
              ))}
              <td key="timestamp">{signup.createdAt}</td>
              <td key="delete">
                <Button
                  type="button"
                  variant="danger"
                  onClick={async () => {
                    const confirmation = window.confirm(
                      'Are you sure? The removal cannot be undone.',
                    );
                    if (confirmation) {
                      await dispatch(deleteSignup(signup.id!));
                      dispatch(getEvent(event.id));
                    }
                  }}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SignupsTab;
