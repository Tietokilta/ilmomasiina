import React, { useEffect, useRef } from "react";

import { Form } from "react-bootstrap";
import { useForm } from "react-final-form";
import { useTranslation } from "react-i18next";
import Combobox from "react-widgets/Combobox";

import FieldRow from "../../../components/FieldRow";
import { checkingSlugAvailability, checkSlugAvailability, loadCategories } from "../../../modules/editor/actions";
import { EditorEventType } from "../../../modules/editor/types";
import { useTypedDispatch, useTypedSelector } from "../../../store/reducers";
import DateTimePicker from "./DateTimePicker";
import useEditorErrors from "./errors";
import { useFieldTouched, useFieldValue } from "./hooks";
import LanguageSelect from "./LanguageSelect";
import LanguageVersions from "./LanguageVersions";
import LocalizedFieldRow from "./LocalizedFieldRow";
import SelectBox from "./SelectBox";
import SlugField from "./SlugField";
import Textarea from "./Textarea";

// How long to wait (in ms) for the user to finish typing the slug before checking it.
const SLUG_CHECK_DELAY = 250;

const GenerateSlug = () => {
  const isNew = useTypedSelector((state) => state.editor.isNew);
  const form = useForm();
  const title = useFieldValue<string>("title");
  const touched = useFieldTouched("slug");

  useEffect(() => {
    if (isNew && !touched && title !== undefined) {
      const generatedSlug = title
        .normalize("NFD") // converts e.g. ä to a + umlaut
        .replace(/[^A-Za-z0-9]+/g, "")
        .toLocaleLowerCase("fi");
      form.change("slug", generatedSlug);
    }
  }, [form, isNew, title, touched]);

  return null;
};

const SlugAvailability = () => {
  const slugAvailability = useTypedSelector((state) => state.editor.slugAvailability);
  const eventId = useTypedSelector((state) => state.editor.event?.id);
  const dispatch = useTypedDispatch();
  const { t } = useTranslation();

  const slug = useFieldValue<string>("slug");

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

  if (!slug) {
    return null;
  }
  if (slugAvailability === "checking") {
    return <Form.Text>{t("editor.basic.url.checking")}</Form.Text>;
  }
  if (slugAvailability === null) {
    return null;
  }
  if (slugAvailability.id === null || slugAvailability.id === eventId) {
    return <Form.Text className="text-success">{t("editor.basic.url.free")}</Form.Text>;
  }
  return (
    <Form.Text className="text-danger">{t("editor.basic.url.reserved", { event: slugAvailability.title })}</Form.Text>
  );
};

const BasicDetailsTab = () => {
  const dispatch = useTypedDispatch();
  const allCategories = useTypedSelector((state) => state.editor.allCategories);
  const { t } = useTranslation();
  const formatError = useEditorErrors();

  const eventType = useFieldValue<EditorEventType>("eventType");
  const date = useFieldValue<Date | null>("date");
  const endDate = useFieldValue<Date | null>("date");

  useEffect(() => {
    dispatch(loadCategories());
  }, [dispatch]);

  return (
    <div>
      <LanguageSelect />
      <FieldRow name="languages" label={t("editor.basic.languages")} help={t("editor.basic.languages.info")} checkAlign>
        <LanguageVersions />
      </FieldRow>
      <LocalizedFieldRow
        name="title"
        defaultAsPlaceholder
        label={t("editor.basic.name")}
        required
        maxLength={255}
        formatError={formatError}
      />
      <GenerateSlug />
      <FieldRow
        name="slug"
        label={t("editor.basic.url")}
        required
        maxLength={255}
        extraFeedback={<SlugAvailability />}
        as={SlugField}
        formatError={formatError}
      />
      <FieldRow
        name="listed"
        label={t("editor.basic.listed")}
        as={Form.Check}
        type="checkbox"
        checkAlign
        checkLabel={t("editor.basic.listed.check")}
        help={t("editor.basic.listed.info")}
        formatError={formatError}
      />
      <FieldRow
        name="eventType"
        label={t("editor.basic.type")}
        as={SelectBox}
        options={[
          [EditorEventType.ONLY_EVENT, t("editor.basic.type.onlyEvent")],
          [EditorEventType.EVENT_WITH_SIGNUP, t("editor.basic.type.eventWithSignup")],
          [EditorEventType.ONLY_SIGNUP, t("editor.basic.type.onlySignup")],
        ]}
        formatError={formatError}
      />
      {eventType !== EditorEventType.ONLY_SIGNUP && (
        <FieldRow
          name="date"
          id="date"
          label={t("editor.basic.startDate")}
          as={DateTimePicker}
          selectsStart
          endDate={endDate}
          required
          formatError={formatError}
        />
      )}
      {eventType !== EditorEventType.ONLY_SIGNUP && (
        <FieldRow
          name="endDate"
          id="endDate"
          label={t("editor.basic.endDate")}
          as={DateTimePicker}
          selectsEnd
          startDate={date}
          help={t("editor.basic.endDate.info")}
          formatError={formatError}
        />
      )}
      {eventType !== EditorEventType.ONLY_EVENT && (
        <FieldRow
          name="registrationStartDate"
          id="registrationStartDate"
          as={DateTimePicker}
          label={t("editor.basic.registrationStartDate")}
          required
          formatError={formatError}
        />
      )}
      {eventType !== EditorEventType.ONLY_EVENT && (
        <FieldRow
          name="registrationEndDate"
          id="registrationEndDate"
          as={DateTimePicker}
          label={t("editor.basic.registrationEndDate")}
          required
          formatError={formatError}
        />
      )}
      {eventType !== EditorEventType.ONLY_EVENT && (
        <FieldRow
          name="signupsPublic"
          label={t("editor.basic.signupsPublic")}
          as={Form.Check}
          type="checkbox"
          checkAlign
          checkLabel={t("editor.basic.signupsPublic.check")}
          help={t("editor.basic.signupsPublic.info")}
          formatError={formatError}
        />
      )}
      <FieldRow
        name="category"
        label={t("editor.basic.category")}
        as={Combobox}
        data={allCategories || []}
        busy={allCategories === null}
        inputProps={{ maxLength: 255 }}
        formatError={formatError}
      />
      <LocalizedFieldRow
        name="webpageUrl"
        defaultAsPlaceholder
        label={t("editor.basic.homePage")}
        maxLength={255}
        formatError={formatError}
      />
      <LocalizedFieldRow
        name="facebookUrl"
        defaultAsPlaceholder
        label={t("editor.basic.facebook")}
        maxLength={255}
        formatError={formatError}
      />
      <LocalizedFieldRow
        name="location"
        defaultAsPlaceholder
        label={t("editor.basic.location")}
        maxLength={255}
        formatError={formatError}
      />
      <LocalizedFieldRow
        name="price"
        defaultAsPlaceholder
        label={t("editor.basic.price")}
        maxLength={255}
        formatError={formatError}
      />
      <LocalizedFieldRow
        name="description"
        defaultAsPlaceholder
        label={t("editor.basic.description")}
        help={t("editor.basic.description.info")}
        as={Textarea}
        rows={8}
        formatError={formatError}
      />
    </div>
  );
};

export default BasicDetailsTab;
