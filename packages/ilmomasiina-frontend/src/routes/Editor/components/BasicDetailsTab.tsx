import React, { useEffect, useRef } from 'react';

import { useFormikContext } from 'formik';
import { Form } from 'react-bootstrap';
import { shallowEqual } from 'react-redux';

import { FieldRow } from '@tietokilta/ilmomasiina-components';
import { checkingSlugAvailability, checkSlugAvailability, loadCategories } from '../../../modules/editor/actions';
import { EditorEvent, EditorEventType } from '../../../modules/editor/types';
import { useTypedDispatch, useTypedSelector } from '../../../store/reducers';
import Autocomplete from './Autocomplete';
import DateTimePicker from './DateTimePicker';
import SelectBox from './SelectBox';
import SlugField from './SlugField';
import Textarea from './Textarea';

// How long to wait (in ms) for the user to finish typing the slug before checking it.
const SLUG_CHECK_DELAY = 250;

const BasicDetailsTab = () => {
  const dispatch = useTypedDispatch();
  const {
    isNew, slugAvailability, event, allCategories,
  } = useTypedSelector((state) => state.editor, shallowEqual);

  const {
    values: {
      title, slug, eventType, date, endDate,
    },
    touched: { slug: slugTouched },
    setFieldValue,
  } = useFormikContext<EditorEvent>();

  useEffect(() => {
    if (isNew && !slugTouched && title !== undefined) {
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
      if (slug) {
        dispatch(checkSlugAvailability(slug));
      }
    }, SLUG_CHECK_DELAY);
  }, [dispatch, slug]);

  useEffect(() => {
    dispatch(loadCategories());
  }, [dispatch]);

  let slugFeedback = null;
  if (slugAvailability === 'checking') {
    slugFeedback = <Form.Text>Checking availability&hellip;</Form.Text>;
  } else if (slugAvailability !== null) {
    if (slugAvailability.id === null || slugAvailability.id === event?.id) {
      slugFeedback = <Form.Text className="text-success">URL Free!</Form.Text>;
    } else {
      slugFeedback = (
        <Form.Text className="text-danger">
          {'URL is already in use with an event '}
          {slugAvailability.title}
        </Form.Text>
      );
    }
  }

  return (
    <div>
      <FieldRow
        name="title"
        label="Name of the event"
        required
        alternateError="* Title is required."
      />
      <FieldRow
        name="slug"
        label="The event url"
        required
        alternateError="* URL extension is required."
        extraFeedback={slugFeedback}
        as={SlugField}
      />
      <FieldRow
        name="listed"
        label="Publicity"
        as={Form.Check}
        type="checkbox"
        checkAlign
        checkLabel="Show on the event list"
        help={
          'Hidden events can only be accessed by URL. Events saved ' + 
          'as a draft cannot be viewed as a user regardless of this setting.'
        }
      />
      <FieldRow
        name="eventType"
        label="Event Type"
        as={SelectBox}
        options={[
          [EditorEventType.ONLY_EVENT, 'An event without Sign-ups'],
          [EditorEventType.EVENT_WITH_SIGNUP, 'Event and Sign-ups'],
          [EditorEventType.ONLY_SIGNUP, 'Sign-ups without an event'],
        ]}
      />
      {eventType !== EditorEventType.ONLY_SIGNUP && (
        <FieldRow
          name="date"
          label="Start time"
          as={DateTimePicker}
          selectsStart
          endDate={endDate}
          required
          alternateError="* The start time is required."
        />
      )}
      {eventType !== EditorEventType.ONLY_SIGNUP && (
        <FieldRow
          name="endDate"
          label="End Date"
          as={DateTimePicker}
          selectsEnd
          startDate={date}
          help="An event will only appear in the calendar export if an end time has been set for it."
        />
      )}
      <FieldRow
        name="category"
        label="Category"
        as={Autocomplete}
        options={allCategories || []}
        busy={allCategories === null}
      />
      <FieldRow
        name="webpageUrl"
        label="Address of the website"
      />
      <FieldRow
        name="facebookUrl"
        label="Facebook event"
      />
      <FieldRow
        name="location"
        label="Location"
      />
      <FieldRow
        name="description"
        label="Description"
        help="Markdown can be used in the description."
        as={Textarea}
        rows={8}
      />
    </div>
  );
};

export default BasicDetailsTab;
