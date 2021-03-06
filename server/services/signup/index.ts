/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
import { AdapterService } from '@feathersjs/adapter-commons';
import { MethodNotAllowed } from '@feathersjs/errors';
import { Id, Params } from '@feathersjs/feathers';
import { IlmoApplication } from '../../defs';
import createNewSignup, { SignupCreateBody, SignupCreateResponse } from './createNewSignup';
import deleteSignup from './deleteSignup';
import getSignupForEdit, { SignupGetResponse } from './getSignupForEdit';
import updateSignup, { SignupUpdateBody, SignupUpdateResponse } from './updateSignup';

type SignupsServiceResponses = SignupGetResponse | SignupCreateResponse | SignupUpdateResponse | null;

export class SignupsService extends AdapterService<SignupsServiceResponses> {
  _find(): never {
    throw new MethodNotAllowed('Cannot GET /api/signups');
  }

  _get(id: Id, params?: Params) {
    return getSignupForEdit(Number(id), params);
  }

  _create(data: SignupCreateBody) {
    return createNewSignup(data);
  }

  _update(): never {
    throw new MethodNotAllowed('Cannot PUT /api/signups/ID');
  }

  _patch(id: Id, data: SignupUpdateBody, params?: Params) {
    return updateSignup(Number(id), data, params);
  }

  _remove(id: Id, params?: Params) {
    return deleteSignup(Number(id), params);
  }
}

export default function (this: IlmoApplication) {
  const app = this;

  app.use('/api/signups', new SignupsService({}));
}
