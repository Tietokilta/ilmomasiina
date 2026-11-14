import React, { ComponentType, lazy, Suspense } from "react";

import { Container, Spinner } from "react-bootstrap";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import { Flip, ToastContainer } from "react-toastify";

import Footer from "../components/Footer";
import Header from "../components/Header";
import paths from "../paths";
import PageNotFound from "../routes/404/PageNotFound";

import "react-toastify/dist/ReactToastify.css";
import "../styles/app.scss";

// Also code-split RenewLogin to avoid strong dependency on the store.
const RenewLogin = lazy(() => import("./RenewLogin"));

const loadingFallback = (
  <div className="ilmo--loading-container">
    <Spinner animation="border" />
  </div>
);

// Code-split route components.
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default });

const Layout = () => (
  <>
    <Suspense>
      <RenewLogin />
    </Suspense>
    <div className="layout-wrapper">
      <Header />
      <Container>
        <Outlet />
      </Container>
      <Footer />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        transition={Flip}
      />
    </div>
  </>
);

const router = createBrowserRouter([
  {
    element: <Layout />,
    HydrateFallback: () => loadingFallback,
    children: [
      { path: paths.eventsList, lazy: page(() => import("../routes/EventList")) },
      { path: paths.eventDetails(":slug"), lazy: page(() => import("../routes/SingleEvent")) },
      { path: paths.editSignup(":id", ":editToken"), lazy: page(() => import("../routes/EditSignup")) },
      {
        path: paths.completePayment(":id", ":editToken"),
        lazy: async () => {
          const { default: EditSignup } = await import("../routes/EditSignup");
          return { Component: () => <EditSignup paid /> };
        },
      },
      { path: paths.adminLogin, lazy: page(() => import("../routes/Login")) },
      { path: paths.adminInitialSetup, lazy: page(() => import("../routes/InitialSetup")) },
      { path: paths.adminEventsList, lazy: page(() => import("../routes/AdminEventsList")) },
      { path: paths.adminUsersList, lazy: page(() => import("../routes/AdminUsers")) },
      { path: paths.adminEditEvent(":id"), lazy: page(() => import("../routes/Editor")) },
      {
        path: paths.adminCopyEvent(":id"),
        lazy: async () => {
          const { default: Editor } = await import("../routes/Editor");
          return { Component: () => <Editor copy /> };
        },
      },
      { path: paths.adminAuditLog, lazy: page(() => import("../routes/AuditLog")) },
      { path: "*", element: <PageNotFound /> },
    ],
  },
]);

const AppContainer = () => <RouterProvider router={router} />;

export default AppContainer;
