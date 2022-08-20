import React, { useState } from 'react';

import { Formik, FormikHelpers } from 'formik';
import { Button, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';

import { SignupUpdateSchema } from '@tietokilta/ilmomasiina-models/src/schema';
import FieldRow from '../../../components/FieldRow';
import { paths } from '../../../config/paths';
import { linkComponent, useNavigate } from '../../../config/router';
import { useStateAndDispatch } from '../../../modules/editSignup';
import { useUpdateSignup } from '../../../modules/editSignup/actions';
import DeleteSignup from './DeleteSignup';
import NarrowContainer from './NarrowContainer';
import QuestionFields from './QuestionFields';
import SignupStatus from './SignupStatus';

const EditForm = () => {
  const [{ event, signup }] = useStateAndDispatch();
  // @ts-ignore
  const isNew = !signup!.confirmed;
  const updateSignup = useUpdateSignup();
  const Link = linkComponent();
  const navigate = useNavigate();

  // TODO: actually use errors from API
  const [submitError, setSubmitError] = useState(false);

  async function onSubmit(answers: SignupUpdateSchema, { setSubmitting }: FormikHelpers<SignupUpdateSchema>) {
    const action = isNew ? 'Ilmoittautuminen' : 'Muokkaus';
    const progressToast = toast.loading(`${action} käynnissä`);

    try {
      await updateSignup(answers);

      toast.update(progressToast, {
        render: `${action} onnistui!`,
        type: toast.TYPE.SUCCESS,
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
      setSubmitError(false);
      setSubmitting(false);
      if (isNew) {
        navigate(paths().eventDetails(event!.slug));
      }
    } catch (error) {
      toast.update(progressToast, {
        render: `${action} ei onnistunut. Tarkista, että kaikki pakolliset kentät on täytetty ja yritä uudestaan.`,
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
      setSubmitError(true);
      setSubmitting(false);
    }
  }

  return (
    <Formik
      initialValues={signup! as SignupUpdateSchema}
      onSubmit={onSubmit}
    >
      {({ handleSubmit, isSubmitting }) => (
        <NarrowContainer>
          <h2>{isNew ? 'Ilmoittaudu' : 'Muokkaa ilmoittautumista'}</h2>
          <SignupStatus />
          {submitError && (
            <p className="ilmo--form-error">Ilmoittautumisessasi on virheitä.</p>
          )}
          <Form onSubmit={handleSubmit} className="ilmo--form">
            {event!.nameQuestion && (
              <>
                <FieldRow
                  name="firstName"
                  label="Etunimi / First name"
                  placeholder="Etunimi"
                  required
                  disabled={!isNew}
                />
                <FieldRow
                  name="lastName"
                  label="Sukunimi / Last name"
                  placeholder="Sukunimi"
                  required
                  disabled={!isNew}
                />
                <FieldRow
                  name="namePublic"
                  as={Form.Check}
                  type="checkbox"
                  checkAlign
                  checkLabel={(
                    <>
                      Näytä nimi julkisessa osallistujalistassa
                      <br />
                      Show name in public participant list
                    </>
                  )}
                />
              </>
            )}
            {event!.emailQuestion && (
              <FieldRow
                name="email"
                label="Sähköposti / Email"
                placeholder="Sähköpostisi"
                required
                disabled={!isNew}
              />
            )}

            <QuestionFields name="answers" questions={event!.questions} />

            <p>
              Voit muokata ilmoittautumistasi tai poistaa sen myöhemmin tallentamalla tämän sivun URL-osoitteen.
              {event!.emailQuestion && ' Linkki lähetetään myös sähköpostiisi vahvistusviestissä.'}
            </p>

            <nav className="ilmo--submit-buttons">
              {!isNew && (
                <Button as={Link} variant="link" to={paths().eventDetails(event!.slug)}>
                  Peruuta
                </Button>
              )}
              <Button type="submit" variant="primary" formNoValidate disabled={isSubmitting}>
                {isNew ? 'Lähetä' : 'Päivitä'}
              </Button>
            </nav>
          </Form>
          <DeleteSignup />
        </NarrowContainer>
      )}
    </Formik>
  );
};

export default EditForm;
