import React, { useEffect, useRef } from 'react';

import { useFormikContext } from 'formik';
import { Form } from 'react-bootstrap';
import { shallowEqual } from 'react-redux';

import FieldRow from '../../../components/FieldRow';
import { checkingSlugAvailability, checkSlugAvailability } from '../../../modules/editor/actions';
import { EditorEvent } from '../../../modules/editor/types';
import { useTypedDispatch, useTypedSelector } from '../../../store/reducers';
import DateTimePicker from './DateTimePicker';
import SelectBox from './SelectBox';
import SlugField from './SlugField';
import Textarea from './Textarea';

// How long to wait (in ms) for the user to finish typing the slug before checking it.
const SLUG_CHECK_DELAY = 250;

const BasicDetailsTab = () => {
  const dispatch = useTypedDispatch();
  const { isNew, slugAvailability, event } = useTypedSelector((state) => state.editor, shallowEqual);

  const {
    values: { title, slug, eventType },
    touched: { slug: slugTouched },
    setFieldValue,
  } = useFormikContext<EditorEvent>();

  useEffect(() => {
    if (isNew && !slugTouched) {
      const generatedSlug = title
        .normalize('NFD') // converts e.g. ä to a + umlaut
        .replace(/[^A-Za-z0-9]+/g, '')
        .toLocaleLowerCase('fi');
      setFieldValue('slug', generatedSlug);
    }
  }, [setFieldValue, isNew, title, slugTouched]);

  const checkDelay = useRef<number | undefined>();

  useEffect(() => {
    dispatch(checkingSlugAvailability());
    window.clearTimeout(checkDelay.current);
    checkDelay.current = window.setTimeout(() => {
      dispatch(checkSlugAvailability(slug));
    }, SLUG_CHECK_DELAY);
  }, [dispatch, slug]);

  let slugFeedback = null;
  if (slugAvailability === 'checking') {
    slugFeedback = <Form.Text>Tarkistetaan saatavuutta&hellip;</Form.Text>;
  } else if (slugAvailability !== null) {
    if (slugAvailability.id === null || slugAvailability.id === event?.id) {
      slugFeedback = <Form.Text className="text-success">URL-osoite vapaa!</Form.Text>;
    } else {
      slugFeedback = (
        <Form.Text className="text-danger">
          {'URL-osoite on jo käytössä tapahtumalla '}
          {slugAvailability.title}
        </Form.Text>
      );
    }
  }

  return (
    <div>
      <FieldRow
        name="title"
        label="Tapahtuman nimi"
        required
        alternateError="* Otsikko vaaditaan."
      />
      <FieldRow
        name="slug"
        label="Tapahtuman URL"
        required
        alternateError="* URL-pääte vaaditaan."
        extraFeedback={slugFeedback}
        as={SlugField}
      />
      <FieldRow
        name="listed"
        label="Julkisuus"
        as={Form.Check}
        type="checkbox"
        checkAlign
        checkLabel="Näytä tapahtumalistassa"
        help={
          'Piilotettuihin tapahtumiin pääsee vain URL-osoitteella. Luonnoksena tallennettuja tapahtumia ei voi '
          + 'katsella käyttäjänä riippumatta tästä asetuksesta.'
        }
      />
      <FieldRow
        name="eventType"
        label="Tapahtuman tyyppi"
        as={SelectBox}
        options={[
          ['event', 'Tapahtuma ilman ilmoittautumista'],
          ['event+signup', 'Tapahtuma ja ilmoittautuminen'],
          ['signup', 'Ilmoittautuminen ilman tapahtumaa'],
        ]}
      />
      {eventType !== 'signup' && (
        <FieldRow
          name="date"
          label="Ajankohta"
          as={DateTimePicker}
          required
          alternateError="* Ajankohta vaaditaan."
        />
      )}
      <FieldRow
        name="webpageUrl"
        label="Kotisivujen osoite"
      />
      <FieldRow
        name="facebookUrl"
        label="Facebook-tapahtuma"
      />
      <FieldRow
        name="location"
        label="Paikka"
      />
      <FieldRow
        name="description"
        label="Kuvaus"
        help="Kuvauksessa voi käyttää Markdownia."
        as={Textarea}
        rows={8}
      />
    </div>
  );
};

export default BasicDetailsTab;