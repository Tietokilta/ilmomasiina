import React, { useEffect, useRef } from "react";

import { Form } from "react-bootstrap";
import { useForm } from "react-final-form";
import { useTranslation } from "react-i18next";
import Combobox from "react-widgets/Combobox";

import { PaymentMode } from "@tietokilta/ilmomasiina-models";
import FieldRow from "../../../components/FieldRow";
import { EditorEventType } from "../../../modules/editor/types";
import useStore from "../../../modules/store";
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
  const isNew = useStore((state) => state.editor.isNew);
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
  const { slugAvailability, event, checkingSlugAvailability, checkSlugAvailability } = useStore(
    (state) => state.editor,
  );
  const { t } = useTranslation();

  const slug = useFieldValue<string>("slug");

  const checkDelay = useRef<number | undefined>(undefined);
  useEffect(() => {
    checkingSlugAvailability();
    window.clearTimeout(checkDelay.current);
    checkDelay.current = window.setTimeout(() => {
      if (slug) {
        checkSlugAvailability(slug);
      }
    }, SLUG_CHECK_DELAY);
  }, [slug, checkSlugAvailability, checkingSlugAvailability]);

  if (!slug) {
    return null;
  }
  if (slugAvailability === "checking") {
    return <Form.Text>{t("editor.basic.url.checking")}</Form.Text>;
  }
  if (slugAvailability === null) {
    return null;
  }
  if (slugAvailability.id === null || slugAvailability.id === event?.id) {
    return <Form.Text className="text-success">{t("editor.basic.url.free")}</Form.Text>;
  }
  return (
    <Form.Text className="text-danger">{t("editor.basic.url.reserved", { event: slugAvailability.title })}</Form.Text>
  );
};

const BasicDetailsTab = () => {
  const { allCategories, loadCategories } = useStore((state) => state.editor);
  const { t } = useTranslation();
  const formatError = useEditorErrors();

  const eventType = useFieldValue<EditorEventType>("eventType");
  const date = useFieldValue<Date | null>("date");
  const endDate = useFieldValue<Date | null>("endDate");
  const registrationStartDate = useFieldValue<Date | null>("registrationStartDate");
  const registrationEndDate = useFieldValue<Date | null>("registrationEndDate");

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
          selectsStart
          endDate={registrationEndDate}
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
          selectsEnd
          startDate={registrationStartDate}
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
      {eventType !== EditorEventType.ONLY_EVENT && (
        <FieldRow
          name="payments"
          label={t("editor.basic.payments")}
          as={SelectBox}
          options={[
            [PaymentMode.DISABLED, t("editor.basic.payments.disabled")],
            [PaymentMode.MANUAL, t("editor.basic.payments.manual")],
            [PaymentMode.ONLINE, t("editor.basic.payments.online")],
          ]}
          formatError={formatError}
        />
      )}
      {FRONTEND_NAMES.length > 1 && (
        <FieldRow
          name="preferredFrontend"
          label={t("editor.basic.preferredFrontend")}
          help={t("editor.basic.preferredFrontend.info")}
          as={SelectBox}
          options={FRONTEND_NAMES.map((name) => [name, name] as [string, string])}
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
        help={t("editor.basic.price.info")}
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
