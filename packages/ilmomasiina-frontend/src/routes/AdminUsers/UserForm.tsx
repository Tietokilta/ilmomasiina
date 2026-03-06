import React from "react";

import { FormApi } from "final-form";
import { Button, Form as BsForm, FormControl, Spinner } from "react-bootstrap";
import { Form } from "react-final-form";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { ApiError, errorDesc } from "@tietokilta/ilmomasiina-client";
import branding from "../../branding";
import FieldFormGroup from "../../components/FieldFormGroup";
import type { TKey } from "../../i18n";
import useStore from "../../modules/store";

type FormData = {
  email: string;
};

const UserForm = () => {
  const { getUsers, createUser } = useStore((state) => state.adminUsers);
  const { t } = useTranslation();

  const onSubmit = async (data: FormData, form: FormApi<FormData>) => {
    try {
      await createUser(data);
      getUsers();
      form.restart();
      toast.success(t("adminUsers.createUser.success", { email: data.email }), {
        autoClose: 2000,
      });
    } catch (err) {
      toast.error(
        t(errorDesc<TKey>(err as ApiError, "adminUsers.createUser.errors"), {
          email: data.email,
        }),
        { autoClose: 5000 },
      );
    }
  };

  return (
    <Form<FormData>
      initialValues={{
        email: "",
      }}
      onSubmit={onSubmit}
    >
      {({ submitting, handleSubmit }) => (
        <BsForm className="ilmo--form" onSubmit={handleSubmit}>
          <FieldFormGroup name="email" label={t("adminUsers.createUser.email")}>
            {({ input, meta: { touched, error } }) => (
              <FormControl
                {...input}
                type="email"
                required
                isInvalid={touched && error}
                placeholder={branding.loginPlaceholderEmail}
              />
            )}
          </FieldFormGroup>
          <p>{t("adminUsers.createUser.passwordInfo")}</p>
          <Button type="submit" variant="secondary" disabled={submitting}>
            {submitting ? <Spinner animation="border" /> : t("adminUsers.createUser.submit")}
          </Button>
        </BsForm>
      )}
    </Form>
  );
};

export default UserForm;
