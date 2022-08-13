import { Static, Type } from '@sinclair/typebox';

export const auditLoqQuery = Type.Object({
  user: Type.Optional(Type.String({
    title: 'filter events by username',
  })),
  ip: Type.Optional(Type.String({
    title: 'filter events by IP address',
  })),
  action: Type.Optional(
    Type.Array( // TODO: Requires Ajv to be in coerce array mode
      Type.String({
        title: 'action type',
        // TODO: Include action type validation here (using Type.Enum for example)
      }),
      {
        title: 'filter events by actions',
      },
    ),
  ),
  event: Type.Optional(Type.String({
    title: 'filter events by event name or ID',
  })),
  signup: Type.Optional(Type.String({
    title: 'filter events by signup name or ID',
  })),
  limit: Type.Integer({
    title: 'maximum amount of log entries to return',
    minimum: 0,
    default: Number.MAX_SAFE_INTEGER, // TODO: Better limits?
  }),
  offset: Type.Integer({
    title: 'how many (matched) log entries to exclude at the beginning',
    minimum: 0,
    default: 0,
  }),
});

export const auditLogItem = Type.Object({
  id: Type.Integer({
    title: 'audit log event ID',
  }),
  user: Type.Union([
    Type.String({
      title: 'username',
    }),
    Type.Null({
      title: 'no users related to this log item',
    }),
  ], {
    title: 'user related to this log event',
  }),
  ipAddress: Type.String({
    title: 'IP address of where the request came from',
  }),
  action: Type.String({
    title: 'action',
    description: 'what happened',
  }),
  eventId: Type.Union([
    Type.String({
      title: 'event ID',
    }),
    Type.Null({
      title: 'no events related to this log item',
    }),
  ], {
    title: 'ID of the event related to this log item',
  }),
  eventName: Type.Union([
    Type.String({
      title: 'event name',
    }),
    Type.Null({
      title: 'no events related to this log item',
    }),
  ], {
    title: 'name of the event related to this log item',
  }),
  signupId: Type.Union([
    Type.String({
      title: 'signup ID',
    }),
    Type.Null({
      title: 'no signups related to this log item',
    }),
  ], {
    title: 'ID of the signup related to this log item',
  }),
  signupName: Type.Union([
    Type.String({
      title: 'signup name',
    }),
    Type.Null({
      title: 'no signups related to this log item',
    }),
  ], {
    title: 'name of the signup related to this log item',
  }),
  extra: Type.String({
    title: 'Additional information',
  }),
});

export const auditLogQueryResponse = Type.Object({
  rows: Type.Array(
    auditLogItem,
    {
      title: 'found audit log items',
    },
  ),
  count: Type.Integer({
    title: 'amount of all found rows',
    description: 'also counts those not included in this response due to offset & limit parameters',
  }),
});

export type AuditLoqQuery = Static<typeof auditLoqQuery>;
export type AuditLogItem = Static<typeof auditLogItem>;
export type AuditLogQueryResponse = Static<typeof auditLogQueryResponse>;