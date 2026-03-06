import React, { lazy, Suspense } from "react";

import { Container, Spinner } from "react-bootstrap";
import { BrowserRouter, Route, Routes } from "react-router";
import { Flip, ToastContainer } from "react-toastify";

import Footer from "../components/Footer";
import Header from "../components/Header";
import paths from "../paths";
import PageNotFound from "../routes/404/PageNotFound";

import "react-toastify/dist/ReactToastify.css";
import "../styles/app.scss";

// Code-split route components.
const AdminEventsList = lazy(() => import("../routes/AdminEventsList"));
const AdminUsersList = lazy(() => import("../routes/AdminUsers"));
const AuditLog = lazy(() => import("../routes/AuditLog"));
const Editor = lazy(() => import("../routes/Editor"));
const EditSignup = lazy(() => import("../routes/EditSignup"));
const EventList = lazy(() => import("../routes/EventList"));
const InitialSetup = lazy(() => import("../routes/InitialSetup"));
const Login = lazy(() => import("../routes/Login"));
const SingleEvent = lazy(() => import("../routes/SingleEvent"));

// Also code-split RenewLogin to avoid strong dependency on the store.
const RenewLogin = lazy(() => import("./RenewLogin"));

const loadingFallback = (
  <div className="ilmo--loading-container">
    <Spinner animation="border" />
  </div>
);

const AppContainer = () => (
  <BrowserRouter>
    <Suspense>
      <RenewLogin />
    </Suspense>
    <div className="layout-wrapper">
      <Header />
      <Suspense fallback={loadingFallback}>
        <Container>
          <Routes>
            <Route path={paths.eventsList} element={<EventList />} />
            <Route path={paths.eventDetails(":slug")} element={<SingleEvent />} />
            <Route path={paths.editSignup(":id", ":editToken")} element={<EditSignup />} />
            <Route path={paths.completePayment(":id", ":editToken")} element={<EditSignup paid />} />
            <Route path={paths.adminLogin} element={<Login />} />
            <Route path={paths.adminInitialSetup} element={<InitialSetup />} />
            <Route path={paths.adminEventsList} element={<AdminEventsList />} />
            <Route path={paths.adminUsersList} element={<AdminUsersList />} />
            <Route path={paths.adminEditEvent(":id")} element={<Editor />} />
            <Route path={paths.adminCopyEvent(":id")} element={<Editor copy />} />
            <Route path={paths.adminAuditLog} element={<AuditLog />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Container>
      </Suspense>
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
  </BrowserRouter>
);

export default AppContainer;
