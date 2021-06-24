import {
  UserCreateBody as _UserCreateBody,
  UserListItem as _UserListItem,
  UserListResponse as _UserListResponse,
} from '../../server/services/user';
import { StringifyApi } from './utils';

export namespace User {
  export type List = StringifyApi<_UserListResponse>;
  export namespace List {
    export type User = StringifyApi<_UserListItem>;
  }

  export namespace Create {
    export type Body = StringifyApi<_UserCreateBody>;
  }
}
