import http from "k6/http";
import { check, fail } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// Define custom metrics for events list and individual events
const eventsListMetrics = {
  http_req_duration: new Trend("http_req_duration_events_list", true),
  http_req_failed: new Rate("http_req_failed_events_list"),
  http_reqs: new Counter("http_reqs_events_list"),
};

const individualEventsMetrics = {
  http_req_duration: new Trend("http_req_duration_individual_events", true),
  http_req_failed: new Rate("http_req_failed_individual_events"),
  http_reqs: new Counter("http_reqs_individual_events"),
};

// Fetch the dynamic routes in the setup function
export function setup() {
  const eventsList = http.get("http://localhost:3000/api/events").json();
  const eventRoutes = eventsList.map(
    (event) => `http://localhost:3000/api/events/${event.slug}`
  );

  return { eventsList: "http://localhost:3000/api/events", eventRoutes };
}

export const options = {
  discardResponseBodies: false,
  scenarios: {
    events_list: {
      executor: "constant-vus",
      exec: "eventsList",
      vus: 100,
      duration: "30s",
      tags: { my_custom_tag: "events_list" },
    },
    individual_events: {
      executor: "constant-vus",
      exec: "individualEvents",
      vus: 100,
      startTime: "30s",
      duration: "30s",
      tags: { my_custom_tag: "individual_events" },
    },
  },
};

export function eventsList(data) {
  let url = data.eventsList;
  let res = http.get(url);

  check(res, {
    "status was 200": (r) => r.status == 200,
    "transaction time OK": (r) => r.timings.duration < 200,
  });

  // Record custom metrics
  eventsListMetrics.http_req_duration.add(res.timings.duration);
  eventsListMetrics.http_req_failed.add(res.status !== 200);
  eventsListMetrics.http_reqs.add(1);
}

export function individualEvents(data) {
  let route =
    data.eventRoutes[Math.floor(Math.random() * data.eventRoutes.length)];
  let res = http.get(route);

  check(res, {
    "status was 200": (r) => r.status == 200,
    "transaction time OK": (r) => r.timings.duration < 200,
  });

  // Record custom metrics
  individualEventsMetrics.http_req_duration.add(res.timings.duration);
  individualEventsMetrics.http_req_failed.add(res.status !== 200);
  individualEventsMetrics.http_reqs.add(1);
}
