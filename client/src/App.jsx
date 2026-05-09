import React, { lazy, Suspense } from "react"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import RootLayout from "./pages/RootLayout"
import ErrorPage from "./pages/ErrorPage"
import ProtectedRoute from "./components/ProtectedRoute"
import Loader from "./components/Loader"

// Lazy load pages
const Login = lazy(() => import("./pages/Login"))
const Register = lazy(() => import("./pages/Register"))
const Congarats = lazy(() => import("./pages/Congarats"))
const Logout = lazy(() => import("./pages/Logout"))
const ElectionDetails = lazy(() => import("./pages/ElectionDetails"))
const Candidates = lazy(() => import("./pages/Candidates"))
const Elections = lazy(() => import("./pages/Elections"))
const Result = lazy(() => import("./pages/Result"))

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<Loader />}>
        <RootLayout />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "results",
        element: <ProtectedRoute><Result /></ProtectedRoute>,
      },
      {
        path: "elections",
        element: <ProtectedRoute><Elections /></ProtectedRoute>,
      },
      {
        path: "elections/:id",
        element: <ProtectedRoute><ElectionDetails /></ProtectedRoute>,
      },
      {
        path: "elections/:id/candidates",
        element: <ProtectedRoute><Candidates  /></ProtectedRoute>,
      },
      {
        path: "congrats",
        element: <Congarats />,
      },
      {
        path: "logout",
        element: <Logout />,
      },
    ],
  },
])


function App() { 
 return (<RouterProvider router={router} />)
}

export default App
