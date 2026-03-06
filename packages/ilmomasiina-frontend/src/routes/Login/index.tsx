import React from "react";

import { FORM_ERROR } from "final-form";
import { Alert, Button, Form as BsForm, FormControl } from "react-bootstrap";
import { Form } from "react-final-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { errorDesc } from "@tietokilta/ilmomasiina-client";
import branding from "../../branding";
import FieldFormGroup from "../../components/FieldFormGroup";
import type { TKey } from "../../i18n";
import { loginToast } from "../../modules/auth";
import useStore from "../../modules/store";
import paths from "../../paths";
import useEvent from "../../utils/useEvent";

import "./Login.scss";

type FormData = {
  email: string;
  password: string;
};

const initialValues: FormData = {
  email: "",
  password: "",
};

const Login = () => {
  const { login } = useStore((state) => state.auth);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const onSubmit = useEvent(async (data: FormData) => {
    const { email, password } = data;
    try {
      await login(email, password);
      loginToast("success", t("auth.loginSuccess"), 2000);
      navigate(paths.adminEventsList);
      return undefined;
    } catch (err) {
      return { [FORM_ERROR]: err };
    }
  });

  return (
    <div className="login-container">
      <h1>{t("login.title")}</h1>
      <Form<FormData> initialValues={initialValues} onSubmit={onSubmit}>
        {({ handleSubmit, submitting, submitError }) => (
          <BsForm onSubmit={handleSubmit} className="ilmo--form">
            {submitError && <Alert variant="danger">{t(errorDesc<TKey>(submitError, "login.errors"))}</Alert>}
            <FieldFormGroup name="email" required label={t("login.email")}>
              {({ input, meta: { touched, error } }) => (
                <FormControl
                  {...input}
                  type="email"
                  required
                  placeholder={branding.loginPlaceholderEmail}
                  isInvalid={touched && error}
                />
              )}
            </FieldFormGroup>
            <FieldFormGroup name="password" required label={t("login.password")}>
              {({ input, meta: { touched, error } }) => (
                <FormControl {...input} type="password" required placeholder="••••••••" isInvalid={touched && error} />
              )}
            </FieldFormGroup>
            <Button type="submit" variant="secondary" disabled={submitting}>
              {t("login.submit")}
            </Button>
          </BsForm>
        )}
      </Form>
    </div>
  );
};

export default Login;
